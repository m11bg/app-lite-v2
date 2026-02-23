import React, { memo, useCallback, useMemo, useState, useEffect } from 'react';
import { View, StyleSheet, useWindowDimensions, Platform, Pressable, LayoutChangeEvent, GestureResponderEvent, Animated, Vibration } from 'react-native';
import { Card, Text, Avatar } from 'react-native-paper';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import { VideoView, useVideoPlayer } from 'expo-video';
import MediaProgressIndicator from '@/components/offers/MediaProgressIndicator';
import { toAbsoluteMediaUrls } from '@/utils/mediaUrl';
import { OfertaServico } from '@/types/oferta';
import { colors, spacing, radius, layout } from '@/styles/theme';
import { SkeletonBox } from '@/components/profile/skeletons/SkeletonPrimitives';
import { OFFER_TRANSLATIONS } from '@/constants/translations';
import { useSwiperIndex } from '@/context/SwiperIndexContext';

interface OfferSwipeCardProps {
    item: OfertaServico;
    // Manter compatibilidade: ainda aceitamos isActiveCard, mas preferimos calcular via contexto + index
    isActiveCard?: boolean;
    index?: number;
    accessibilityHint?: string;
    isMuted?: boolean;
    onToggleMute?: () => void;
    onPress?: () => void;
}

type MediaItem = { type: 'image' | 'video'; url: string };

const FALLBACK_IMAGE = 'https://via.placeholder.com/800x600?text=Oferta';
const PLACEHOLDER_BLURHASH = 'L5H2EC=PM+yV0g-mq.wG9c010J}I';

const priceFormatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
});

// Variável de controle fora do componente para persistir durante a sessão da app
// Ajuda a identificar se o usuário já descobriu como navegar entre mídias
let mediaNavigationHintDismissed = false;

/**
 * Componente que renderiza um cartão individual para a funcionalidade de "Swipe" (deslizar) de ofertas.
 * Este componente exibe de forma atraente as informações cruciais de um serviço oferecido,
 * incluindo imagem, categoria, título, descrição, dados do prestador e valor.
 * 
 * @component
 * @param {OfferSwipeCardProps} props - Propriedades recebidas pelo componente.
 * @param {OfertaServico} props.item - Os dados da oferta que serão exibidos no cartão.
 * @returns {React.ReactElement} O elemento JSX que compõe o cartão de oferta.
 */
const OfferSwipeCard: React.FC<OfferSwipeCardProps> = ({ item, isActiveCard, index, accessibilityHint, isMuted: propsMuted, onToggleMute: propsToggleMute, onPress }) => {
    const { width: windowWidth, height: windowHeight } = useWindowDimensions();
    const [imageErrored, setImageErrored] = useState(false);
    const [videoErrored, setVideoErrored] = useState(false);
    const [mediaLoaded, setMediaLoaded] = useState(false);
    const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
    const [mediaWidth, setMediaWidth] = useState(0);
    const [videoProgress, setVideoProgress] = useState(0);
    const [localMuted, setLocalMuted] = useState(true);
    const [localHintShown, setLocalHintShown] = useState(false);
    const strings = OFFER_TRANSLATIONS.CARD;

    const currentIndexFromContext = useSwiperIndex();
    const computedIsActive = typeof index === 'number'
        ? index === currentIndexFromContext
        : (typeof isActiveCard === 'boolean' ? isActiveCard : true);

    const isMuted = propsMuted ?? localMuted;
    const onToggleMute = useCallback(() => {
        if (propsToggleMute) {
            propsToggleMute();
        } else {
            setLocalMuted((prev) => !prev);
        }
    }, [propsToggleMute]);

    const leftFlashAnim = useMemo(() => new Animated.Value(0), []);
    const rightFlashAnim = useMemo(() => new Animated.Value(0), []);
    const centerFlashAnim = useMemo(() => new Animated.Value(0), []);

    const triggerFlash = useCallback((anim: Animated.Value) => {
        anim.setValue(0);
        Animated.sequence([
            Animated.timing(anim, {
                toValue: 1,
                duration: 100,
                useNativeDriver: true,
            }),
            Animated.timing(anim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const imageUrls = useMemo(() => toAbsoluteMediaUrls(item?.imagens), [item?.imagens]);
    const videoUrls = useMemo(() => toAbsoluteMediaUrls(item?.videos), [item?.videos]);
    const allMedia: MediaItem[] = useMemo(
        () => [
            ...imageUrls.map((url) => ({ type: 'image' as const, url })),
            ...videoUrls.map((url) => ({ type: 'video' as const, url })),
        ],
        [imageUrls, videoUrls]
    );
    const currentMedia = allMedia[currentMediaIndex];

    const cardWidth = useMemo(() => {
        const safeWidth = Number.isFinite(windowWidth) && windowWidth > 0 ? windowWidth : (layout?.cardWidthFallback ?? 375);
        const clamped = Math.max(layout?.minScreenWidth ?? 320, safeWidth);
        return clamped * (layout?.cardWidthRatio ?? 0.9);
    }, [windowWidth]);

    const cardMaxHeight = useMemo(() => {
        // Calcula uma altura máxima segura para evitar sobreposição com botões de ação
        // Header (~60) + Status Bar (~30) + Action Buttons (~120) + Margens (~20) = ~230
        const reservedSpace = Platform.select({ ios: 240, android: 220, default: 230 });
        const calculated = windowHeight - reservedSpace;
        // Garante que o card tenha pelo menos 380px de altura para ser minimamente informativo
        return Math.max(380, calculated);
    }, [windowHeight]);

    // placeholder: manter referência de fallback quando não houver mídias válidas
    const hasMedia = allMedia.length > 0;

    const precoNumber = typeof item?.preco === 'number' ? item.preco : Number(item?.preco ?? 0);
    const safePrice = Number.isFinite(precoNumber) && precoNumber >= 0 ? precoNumber : 0;

    const formattedPrice = useMemo(() => priceFormatter.format(safePrice), [safePrice]);

    const categoria = useMemo(() => (item?.categoria?.trim() || strings.FALLBACKS.IMAGE_TEXT).toUpperCase(), [item?.categoria, strings.FALLBACKS.IMAGE_TEXT]);
    const titulo = item?.titulo?.trim() || strings.FALLBACKS.TITLE;
    const descricao = item?.descricao?.trim() || strings.FALLBACKS.DESCRIPTION;
    const unidadePreco = item?.unidadePreco?.trim() || strings.FALLBACKS.PRICE_UNIT;
    const prestadorNome = item?.prestador?.nome?.trim() || strings.FALLBACKS.PROVIDER;
    const cidade = item?.localizacao?.cidade?.trim() || strings.FALLBACKS.CITY;
    const avatarUri = item?.prestador?.avatar;

    const accessibilityCardLabel = useMemo(() => `Oferta: ${titulo} em ${cidade}`, [titulo, cidade]);
    const accessibilityImageLabel = useMemo(
        () => `${strings.ACCESSIBILITY.IMAGE_PREFIX} ${titulo}`,
        [strings.ACCESSIBILITY.IMAGE_PREFIX, titulo],
    );
    const accessibilityPrestadorLabel = useMemo(
        () => `${strings.ACCESSIBILITY.PROVIDER_PREFIX} ${prestadorNome} de ${cidade}`,
        [strings.ACCESSIBILITY.PROVIDER_PREFIX, prestadorNome, cidade],
    );
    const accessibilityPriceLabel = useMemo(
        () => `${strings.ACCESSIBILITY.PRICE_PREFIX} ${formattedPrice} por ${unidadePreco}`,
        [formattedPrice, strings.ACCESSIBILITY.PRICE_PREFIX, unidadePreco],
    );

    const handleImageError = useCallback(() => setImageErrored(true), []);

    const handleVideoError = useCallback((err: any) => {
        if (__DEV__) console.warn('Erro ao carregar ou reproduzir vídeo:', err);
        setVideoErrored(true);
    }, []);

    const onMediaLayout = useCallback((e: LayoutChangeEvent) => {
        setMediaWidth(e.nativeEvent.layout.width || 0);
    }, []);

    const handleMediaPress = useCallback((event: GestureResponderEvent) => {
        mediaNavigationHintDismissed = true; // Marcar como descoberto em qualquer interação com a mídia
        const x = event.nativeEvent?.locationX ?? 0;
        const width = mediaWidth || cardWidth;
        if (!width || width <= 0) return;
        const left = width / 3;
        const right = (2 * width) / 3;
        if (x < left) {
            if (currentMediaIndex > 0) {
                setCurrentMediaIndex((prev) => Math.max(0, prev - 1));
                triggerFlash(leftFlashAnim);
                Vibration.vibrate(10);
            }
        } else if (x > right) {
            if (currentMediaIndex < allMedia.length - 1) {
                setCurrentMediaIndex((prev) => Math.min(allMedia.length - 1, prev + 1));
                triggerFlash(rightFlashAnim);
                Vibration.vibrate(10);
            }
        } else {
            // centro: toggle de som
            onToggleMute();
            triggerFlash(centerFlashAnim);
        }
    }, [mediaWidth, cardWidth, allMedia.length, currentMediaIndex, triggerFlash, leftFlashAnim, rightFlashAnim, onToggleMute, centerFlashAnim]);

    // Resetar mídia quando o card deixar de ser ativo e quando o item mudar
    useEffect(() => {
        if (!computedIsActive) {
            setCurrentMediaIndex(0);
            setMediaLoaded(false);
            setVideoProgress(0);
            setVideoErrored(false);
        }
    }, [computedIsActive]);

    useEffect(() => {
        setCurrentMediaIndex(0);
        setImageErrored(false);
        setVideoErrored(false);
        setMediaLoaded(false);
        setVideoProgress(0);
    }, [item?._id]);

    useEffect(() => {
        setImageErrored(false);
        setVideoErrored(false);
        setMediaLoaded(false);
        setVideoProgress(0);
    }, [currentMediaIndex]);

    // Efeito para mostrar uma dica visual sutil (pulse) na primeira vez que vê um card com múltiplas mídias
    useEffect(() => {
        if (computedIsActive && !mediaNavigationHintDismissed && !localHintShown && allMedia.length > 1 && currentMediaIndex === 0) {
            const timer = setTimeout(() => {
                // Checar novamente se foi dispensado durante o timeout
                if (mediaNavigationHintDismissed) return;

                Animated.sequence([
                    Animated.timing(rightFlashAnim, {
                        toValue: 0.5,
                        duration: 600,
                        useNativeDriver: true,
                    }),
                    Animated.timing(rightFlashAnim, {
                        toValue: 0,
                        duration: 600,
                        useNativeDriver: true,
                    }),
                    Animated.timing(rightFlashAnim, {
                        toValue: 0.5,
                        duration: 600,
                        useNativeDriver: true,
                    }),
                    Animated.timing(rightFlashAnim, {
                        toValue: 0,
                        duration: 600,
                        useNativeDriver: true,
                    }),
                ]).start(() => setLocalHintShown(true));
            }, 2500);

            return () => clearTimeout(timer);
        }
    }, [computedIsActive, localHintShown, allMedia.length, currentMediaIndex, rightFlashAnim]);

    return (
        <Card
            style={[styles.card, { width: cardWidth, maxHeight: cardMaxHeight }]}
            mode="elevated"
            onPress={onPress}
            accessible
            accessibilityRole="button"
            accessibilityLabel={accessibilityCardLabel}
            accessibilityHint={accessibilityHint || strings.ACCESSIBILITY.HINT}
            testID="offer-swipe-card"
        >
            <Pressable
                style={styles.imageContainer}
                onPress={handleMediaPress}
                onLayout={onMediaLayout}
                accessibilityRole="image"
                accessibilityLabel={accessibilityImageLabel}
                accessibilityHint={strings.ACCESSIBILITY.MEDIA_NAV_HINT}
                testID="media-pressable"
            >
                <MediaProgressIndicator 
                    count={allMedia.length} 
                    currentIndex={currentMediaIndex} 
                    progress={currentMedia?.type === 'video' ? videoProgress : 1}
                />

                {/* Feedback visual esquerdo (Flash + Seta) */}
                <Animated.View
                    style={[styles.flashOverlay, styles.leftFlash, { opacity: leftFlashAnim }]}
                    pointerEvents="none"
                    testID="media-flash-left"
                >
                    <Icon name="chevron-left" size={48} color="rgba(255, 255, 255, 0.8)" />
                </Animated.View>

                {/* Feedback visual direito (Flash + Seta) */}
                <Animated.View
                    style={[styles.flashOverlay, styles.rightFlash, { opacity: rightFlashAnim }]}
                    pointerEvents="none"
                    testID="media-flash-right"
                >
                    <Icon name="chevron-right" size={48} color="rgba(255, 255, 255, 0.8)" />
                </Animated.View>

                {/* Feedback visual central (Flash de Som) */}
                <Animated.View
                    style={[styles.flashOverlay, styles.centerFlash, { opacity: centerFlashAnim }]}
                    pointerEvents="none"
                    testID="media-flash-center"
                >
                    <Icon
                        name={isMuted ? 'volume-off' : 'volume-high'}
                        size={64}
                        color="rgba(255, 255, 255, 0.9)"
                    />
                </Animated.View>

                {currentMedia ? (
                    currentMedia.type === 'video' ? (
                        <View style={styles.image}>
                            {videoErrored ? (
                                <>
                                    <Image
                                        source={{ uri: FALLBACK_IMAGE }}
                                        style={styles.image}
                                        contentFit="cover"
                                    />
                                    <View style={styles.errorOverlay}>
                                        <Icon name="video-off" size={40} color="rgba(255, 255, 255, 0.8)" />
                                    </View>
                                </>
                            ) : (
                                <>
                                    {!mediaLoaded && (
                                        <SkeletonBox
                                            width="100%"
                                            height="100%"
                                            radius={0}
                                            style={StyleSheet.absoluteFill}
                                        />
                                    )}
                                    <VideoViewWrapper 
                                        url={currentMedia.url} 
                                        isActive={computedIsActive} 
                                        isMuted={isMuted} 
                                        onReady={() => setMediaLoaded(true)}
                                        onError={handleVideoError}
                                        onProgressUpdate={setVideoProgress}
                                    />
                                    
                                    {/* Sinalização de Vídeo no canto inferior esquerdo */}
                                    <View style={[styles.videoIndicator, { opacity: mediaLoaded ? 1 : 0 }]} pointerEvents="none">
                                        <Icon
                                            name="play"
                                            size={16}
                                            color="white"
                                        />
                                    </View>

                                    {/* Indicador de status de som no canto para vídeos */}
                                    <View style={[styles.muteStatusIndicator, { opacity: mediaLoaded ? 1 : 0 }]} pointerEvents="none">
                                        <Icon
                                            name={isMuted ? 'volume-off' : 'volume-high'}
                                            size={16}
                                            color="white"
                                        />
                                    </View>
                                </>
                            )}
                        </View>
                    ) : (
                        <View style={styles.image}>
                            {!mediaLoaded && (
                                <SkeletonBox
                                    width="100%"
                                    height="100%"
                                    radius={0}
                                    style={StyleSheet.absoluteFill}
                                />
                            )}
                            <Image
                                source={{ uri: imageErrored ? FALLBACK_IMAGE : currentMedia.url }}
                                style={styles.image}
                                contentFit="cover"
                                transition={300}
                                accessibilityLabel={accessibilityImageLabel}
                                accessibilityIgnoresInvertColors={false}
                                onLoad={() => setMediaLoaded(true)}
                                onError={handleImageError}
                            />
                        </View>
                    )
                ) : (
                    <View style={styles.image}>
                        <Image
                            source={{ uri: FALLBACK_IMAGE }}
                            style={styles.image}
                            contentFit="cover"
                            transition={300}
                            accessibilityLabel={accessibilityImageLabel}
                            accessibilityIgnoresInvertColors={false}
                        />
                    </View>
                )}
            </Pressable>

            <View style={styles.contentContainer}>
                <View style={styles.headerSection}>
                    <Text
                        variant="labelSmall"
                        style={styles.categoryLabel}
                        accessibilityLabel={`${strings.ACCESSIBILITY.CATEGORY_PREFIX} ${categoria}`}
                        accessibilityRole="text"
                    >
                        {categoria}
                    </Text>
                    <Text
                        variant="titleLarge"
                        style={styles.title}
                        numberOfLines={2}
                        ellipsizeMode="tail"
                        accessibilityLabel={`${strings.ACCESSIBILITY.TITLE_PREFIX} ${titulo}`}
                        accessibilityRole="text"
                    >
                        {titulo}
                    </Text>
                </View>

                <View style={styles.descriptionSection}>
                    <Text
                        variant="bodyMedium"
                        style={styles.description}
                        numberOfLines={3}
                        ellipsizeMode="tail"
                        accessibilityLabel={`${strings.ACCESSIBILITY.DESCRIPTION_PREFIX} ${descricao}`}
                        accessibilityRole="text"
                    >
                        {descricao}
                    </Text>
                </View>

                <View style={styles.footerSection}>
                    <View
                        style={styles.prestadorInfo}
                        accessible
                        accessibilityLabel={accessibilityPrestadorLabel}
                        accessibilityRole="text"
                    >
                        {avatarUri ? (
                            <Avatar.Image
                                size={36}
                                source={{ uri: avatarUri }}
                                accessibilityRole="image"
                                accessibilityIgnoresInvertColors
                            />
                        ) : (
                            <Avatar.Text
                                size={36}
                                label={prestadorNome ? prestadorNome.charAt(0).toUpperCase() : '?'}
                                accessibilityRole="image"
                                accessibilityIgnoresInvertColors
                            />
                        )}
                        <View style={styles.prestadorText}>
                            <Text variant="labelMedium" style={styles.prestadorNome} numberOfLines={1} ellipsizeMode="tail">
                                {prestadorNome}
                            </Text>
                            <Text variant="bodySmall" style={styles.location} numberOfLines={1} ellipsizeMode="tail">
                                {cidade}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.priceContainer} accessibilityLabel={accessibilityPriceLabel} accessibilityRole="text">
                        <Text variant="titleLarge" style={styles.price} numberOfLines={1} ellipsizeMode="tail">
                            {formattedPrice}
                        </Text>
                        <Text variant="labelSmall" style={styles.priceUnit} numberOfLines={1} ellipsizeMode="tail">
                            /{unidadePreco}
                        </Text>
                    </View>
                </View>
            </View>
        </Card>
    );
};

// Componente interno de vídeo com auto play/pause baseado em visibilidade do card
const VideoViewWrapper: React.FC<{ 
    url: string; 
    isActive: boolean; 
    isMuted: boolean; 
    onReady?: () => void;
    onError?: (error: any) => void;
    onProgressUpdate?: (progress: number) => void;
}> = ({ url, isActive, isMuted, onReady, onError, onProgressUpdate }) => {
    const player = useVideoPlayer(url, (p) => {
        p.loop = true;
        p.muted = isMuted;
    });

    useEffect(() => {
        const timeSub = player.addListener('timeUpdate', (payload) => {
            if (onProgressUpdate && player.duration > 0) {
                onProgressUpdate(payload.currentTime / player.duration);
            }
        });

        const statusSub = player.addListener('statusChange', (payload: any) => {
            if (payload.status === 'error' && onError) {
                onError(payload.error || { message: 'Erro de reprodução de vídeo' });
            }
        });

        return () => {
            timeSub.remove();
            statusSub.remove();
        };
    }, [player, onProgressUpdate, onError]);

    useEffect(() => {
        player.muted = isMuted;
    }, [isMuted, player]);

    useEffect(() => {
        try {
            if (isActive) {
                player.play();
                // Assumimos ready se o player existir e começou a tocar, 
                // para um feedback de skeleton mais simples para vídeos
                if (onReady) onReady();
            } else {
                player.pause();
            }
        } catch (err) {
            if (__DEV__) console.warn('Falha ao controlar reprodução de vídeo:', err);
        }
    }, [isActive, player, url, onReady]);

    return (
        <VideoView
            player={player}
            style={styles.image}
            contentFit="cover"
        />
    );
};

const styles = StyleSheet.create({
    card: {
        borderRadius: radius.xl,
        overflow: 'hidden',
        backgroundColor: colors.surface,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
            },
            android: {
                elevation: 6,
            },
            default: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
            },
        }),
        alignSelf: 'center',
        maxWidth: 600,
    },
    imageContainer: {
        width: '100%',
        aspectRatio: 16 / 10,
        backgroundColor: colors.backdrop,
    },
    image: {
        width: '100%',
        height: '100%',
    },
    flashOverlay: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: '33.3%',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 15, // Acima do MediaProgressIndicator (que é 10)
    },
    leftFlash: {
        left: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        borderTopLeftRadius: radius.xl, // Mantendo o raio do card se necessário, embora o card tenha overflow hidden
    },
    rightFlash: {
        right: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        borderTopRightRadius: radius.xl,
    },
    centerFlash: {
        left: '33.3%',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    muteStatusIndicator: {
        position: 'absolute',
        bottom: spacing.sm,
        right: spacing.sm,
        zIndex: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        borderRadius: radius.full,
        padding: 6,
    },
    videoIndicator: {
        position: 'absolute',
        bottom: spacing.sm,
        left: spacing.sm,
        zIndex: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        borderRadius: radius.full,
        padding: 6,
    },
    errorOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 21,
    },
    contentContainer: {
        padding: spacing.md,
        paddingBottom: spacing.lg, // Respiro suave no rodapé
        gap: spacing.sm,
    },
    headerSection: {
        marginBottom: spacing.xs,
    },
    categoryLabel: {
        color: colors.primary,
        fontWeight: 'bold',
        letterSpacing: 1,
        marginBottom: 2,
        fontSize: 10,
    },
    title: {
        color: colors.onSurface,
        fontWeight: '800',
        lineHeight: 24,
    },
    descriptionSection: {
        marginVertical: spacing.xs,
    },
    description: {
        color: colors.onSurfaceVariant,
        lineHeight: 18,
    },
    footerSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: spacing.sm,
        borderTopWidth: 0.5,
        borderTopColor: colors.border,
        gap: spacing.md,
    },
    prestadorInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flexShrink: 1,
    },
    prestadorText: {
        marginLeft: spacing.sm,
        flexShrink: 1,
    },
    prestadorNome: {
        color: colors.onSurface,
        fontWeight: '700',
    },
    location: {
        color: colors.onSurfaceVariant,
        fontSize: 11,
    },
    priceContainer: {
        alignItems: 'flex-end',
        flexShrink: 0,
        minWidth: 80,
    },
    price: {
        color: colors.primary,
        fontWeight: '800',
    },
    priceUnit: {
        color: colors.onSurfaceVariant,
        fontSize: 10,
    },
});

const arraysShallowEqual = (a?: string[], b?: string[]) => {
    if (a === b) return true;
    if (!a || !b) return !a && !b;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
};

const areEqual = (prev: OfferSwipeCardProps, next: OfferSwipeCardProps) => {
    // Validação básica de existência do item
    if (!prev.item || !next.item) return prev.item === next.item;

    const prevId = prev.item._id;
    const nextId = next.item._id;

    // Se os IDs são diferentes, os itens são diferentes
    if (prevId !== nextId) return false;

    // Se os IDs são iguais, verificamos mudanças profundas em campos críticos de UI
    return (
        prev.item.preco === next.item.preco &&
        prev.item.unidadePreco === next.item.unidadePreco &&
        prev.item.titulo === next.item.titulo &&
        prev.item.descricao === next.item.descricao &&
        prev.item.categoria === next.item.categoria &&
        arraysShallowEqual(prev.item.imagens, next.item.imagens) &&
        arraysShallowEqual(prev.item.videos, next.item.videos) &&
        prev.item.prestador?.nome === next.item.prestador?.nome &&
        prev.item.prestador?.avatar === next.item.prestador?.avatar &&
        prev.item.localizacao?.cidade === next.item.localizacao?.cidade &&
        prev.accessibilityHint === next.accessibilityHint &&
        prev.index === next.index &&
        prev.isMuted === next.isMuted &&
        prev.onPress === next.onPress
    );
};

/**
 * Exportação otimizada do componente utilizando React.memo para evitar re-renderizações desnecessárias
 * enquanto o usuário navega entre os cartões de oferta.
 */
export default memo(OfferSwipeCard, areEqual);
