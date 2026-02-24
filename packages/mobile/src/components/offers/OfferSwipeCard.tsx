import React, { memo, useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { View, StyleSheet, useWindowDimensions, Platform, Pressable, LayoutChangeEvent, GestureResponderEvent, Animated } from 'react-native';
import { vibrateLight } from '@/utils/haptics';
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
    // Auto-avanço: timers e flags
    const autoAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const videoAutoAdvancedRef = useRef(false);

    const triggerFlash = useCallback((anim: Animated.Value) => {
        anim.setValue(0);
        Animated.sequence([
            Animated.timing(anim, {
                toValue: 1,
                duration: 100,
                useNativeDriver: Platform.OS !== 'web',
            }),
            Animated.timing(anim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: Platform.OS !== 'web',
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

    const effectiveMediaWidth = useMemo(() => {
        const fallback = Math.min(cardWidth, 600);
        if (Platform.OS === 'web') {
            return mediaWidth > 0 ? mediaWidth : fallback;
        }
        return mediaWidth || cardWidth;
    }, [cardWidth, mediaWidth]);

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
        setMediaLoaded(true);
    }, []);

    const onMediaLayout = useCallback((e: LayoutChangeEvent) => {
        const nextWidth = e.nativeEvent.layout.width;
        if (Number.isFinite(nextWidth) && nextWidth > 0) {
            setMediaWidth(nextWidth);
        } else if (mediaWidth === 0) {
            setMediaWidth(Math.min(cardWidth, 600));
        }
    }, [cardWidth, mediaWidth]);

    const handleMutePress = useCallback((event: GestureResponderEvent) => {
        // Impede que o clique no ícone de som dispare a navegação de mídia (handleMediaPress)
        if (typeof event.stopPropagation === 'function') {
            event.stopPropagation();
        }
        
        onToggleMute();
        triggerFlash(centerFlashAnim);
        vibrateLight();
    }, [onToggleMute, triggerFlash, centerFlashAnim]);

    const handleMediaPress = useCallback((event: GestureResponderEvent) => {
        mediaNavigationHintDismissed = true; // Marcar como descoberto em qualquer interação com a mídia

        const x = event.nativeEvent?.locationX ?? 0;

        // [SOLUÇÃO: Largura Web] No web, se o onLayout ainda não deu a medida real (0),
        // fazemos um fallback seguro baseado no cardWidth (máximo 600px).
        // Isso evita que o primeiro clique caia sempre na "área esquerda" por conta de um width=0.
        const width = effectiveMediaWidth;

        if (!Number.isFinite(width) || width <= 1) return;

        const left = width / 3;
        const right = (2 * width) / 3;

        if (x < left) {
            if (currentMediaIndex > 0) {
                setCurrentMediaIndex((prev) => Math.max(0, prev - 1));
                triggerFlash(leftFlashAnim);
                vibrateLight();
            }
            return;
        }

        if (x > right) {
            if (currentMediaIndex < allMedia.length - 1) {
                setCurrentMediaIndex((prev) => Math.min(allMedia.length - 1, prev + 1));
                triggerFlash(rightFlashAnim);
                vibrateLight();
            }
            return;
        }

        // centro: toggle de som
        onToggleMute();
        triggerFlash(centerFlashAnim);
    }, [effectiveMediaWidth, allMedia.length, currentMediaIndex, triggerFlash, leftFlashAnim, rightFlashAnim, onToggleMute, centerFlashAnim]);

    // Resetar mídia quando o card deixar de ser ativo e quando o item mudar
    useEffect(() => {
        if (!computedIsActive) {
            setCurrentMediaIndex(0);
            setMediaLoaded(false); // <--- Importante: reseta o estado visual
            setVideoProgress(0);
            setVideoErrored(false);
        }
    }, [computedIsActive]);

    useEffect(() => {
        setCurrentMediaIndex(0);
        setImageErrored(false);
        setVideoErrored(false);
        setMediaLoaded(false); // <--- Importante: reseta o estado visual
        setVideoProgress(0);
    }, [item?._id]);

    useEffect(() => {
        setImageErrored(false);
        setVideoErrored(false);
        setMediaLoaded(false); // <--- Importante: reseta o estado visual
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
                        useNativeDriver: Platform.OS !== 'web',
                    }),
                    Animated.timing(rightFlashAnim, {
                        toValue: 0,
                        duration: 600,
                        useNativeDriver: Platform.OS !== 'web',
                    }),
                    Animated.timing(rightFlashAnim, {
                        toValue: 0.5,
                        duration: 600,
                        useNativeDriver: Platform.OS !== 'web',
                    }),
                    Animated.timing(rightFlashAnim, {
                        toValue: 0,
                        duration: 600,
                        useNativeDriver: Platform.OS !== 'web',
                    }),
                ]).start(() => setLocalHintShown(true));
            }, 2500);

            return () => clearTimeout(timer);
        }
    }, [computedIsActive, localHintShown, allMedia.length, currentMediaIndex, rightFlashAnim]);

    // [SOLUÇÃO: Interlacing Imagens] Auto-avanço para imagens: quando mídia carregada e card ativo, avança após 4s
    useEffect(() => {
        if (!computedIsActive) return;
        const media = currentMedia;
        if (!media || media.type !== 'image') return;
        if (!mediaLoaded) return;

        if (autoAdvanceTimerRef.current) {
            clearTimeout(autoAdvanceTimerRef.current);
            autoAdvanceTimerRef.current = null;
        }
        autoAdvanceTimerRef.current = setTimeout(() => {
            // Avança para a próxima mídia ou volta para a primeira (ciclo)
            setCurrentMediaIndex((prev) => (prev + 1) % Math.max(1, allMedia.length));
        }, 4000);

        return () => {
            if (autoAdvanceTimerRef.current) {
                clearTimeout(autoAdvanceTimerRef.current);
                autoAdvanceTimerRef.current = null;
            }
        };
    }, [computedIsActive, currentMediaIndex, currentMedia?.type, mediaLoaded, allMedia.length]);

    // [SOLUÇÃO: Interlacing Vídeos] Auto-avanço para vídeos: quando progresso chega ao fim (98.5%) e card está ativo
    useEffect(() => {
        if (!computedIsActive) return;
        const media = currentMedia;
        if (!media || media.type !== 'video') return;
        if (videoProgress >= 0.985 && !videoAutoAdvancedRef.current) {
            videoAutoAdvancedRef.current = true;
            setCurrentMediaIndex((prev) => (prev + 1) % Math.max(1, allMedia.length));
        }
    }, [videoProgress, computedIsActive, currentMedia, allMedia.length]);

    // Resetar controles de auto-avanço quando a mídia ou atividade mudar
    useEffect(() => {
        videoAutoAdvancedRef.current = false;
        if (autoAdvanceTimerRef.current) {
            clearTimeout(autoAdvanceTimerRef.current);
            autoAdvanceTimerRef.current = null;
        }
    }, [currentMediaIndex, computedIsActive]);

    useEffect(() => {
        if (!videoErrored) return;
        if (!computedIsActive) return;
        if (allMedia.length <= 1) return;

        const timer = setTimeout(() => {
            setCurrentMediaIndex((prev) => (prev + 1) % Math.max(1, allMedia.length));
        }, 1200);

        return () => clearTimeout(timer);
    }, [videoErrored, computedIsActive, allMedia.length]);

    return (
        <Card
            style={[styles.card, { width: cardWidth, maxHeight: cardMaxHeight }]}
            mode="elevated"
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

                                    {/* Indicador de status de som no canto para vídeos - Agora interativo */}
                                    <Pressable 
                                        style={[styles.muteStatusIndicator, { opacity: mediaLoaded ? 1 : 0 }]} 
                                        onPress={handleMutePress}
                                        accessibilityRole="button"
                                        accessibilityLabel={isMuted ? strings.ACCESSIBILITY.UNMUTE : strings.ACCESSIBILITY.MUTE}
                                        testID="mute-indicator-pressable"
                                    >
                                        <Icon
                                            name={isMuted ? 'volume-off' : 'volume-high'}
                                            size={16}
                                            color="white"
                                        />
                                    </Pressable>
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

            {/* [SOLUÇÃO: Navegação] Movido o onPress do Card para cá (contentContainer). 
                Dessa forma, o clique na área textual leva aos detalhes da oferta, 
                enquanto o clique na mídia fica reservado para trocar imagem/vídeo e som, 
                evitando conflitos de gestos e navegação indesejada no Web. */}
            <Pressable
                style={styles.contentContainer}
                onPress={onPress}
                accessibilityRole="button"
                testID="card-content-pressable"
            >
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
            </Pressable>
        </Card>
    );
};

interface VideoViewWrapperProps {
    url: string;
    isActive: boolean;
    isMuted: boolean;
    onReady?: () => void;
    onError?: (error: any) => void;
    onProgressUpdate?: (progress: number) => void;
}

// --- Componente exclusivo para Web ---
const VideoViewWrapperWeb: React.FC<VideoViewWrapperProps> = ({
    url, isActive, isMuted, onReady, onError, onProgressUpdate
}) => {
    const videoRef = React.useRef<HTMLVideoElement | null>(null);

    // [SOLUÇÃO: Som Vídeo Web] Aplica mute dinamicamente e garante play ao desmutar (quando ativo).
    // Isso contorna políticas de "user gesture" de navegadores; ao clicar no centro da mídia,
    // forçamos o play com som agora permitido pelo gesto.
    useEffect(() => {
        const el = videoRef.current;
        if (!el) return;
        
        // Garantir que os atributos de autoplay e mute estejam sincronizados
        // Se o card está ativo e não está mutado, tentamos dar play (gesto do usuário)
        el.muted = isMuted;
        try {
            el.volume = isMuted ? 0 : 1;
        } catch {}

        if (!isMuted && isActive) {
            const playPromise = el.play();
            if (playPromise !== undefined) {
                playPromise.catch((err) => {
                    if (__DEV__) console.warn('Falha ao dar play com som (web) no toggle:', err);
                });
            }
        }
    }, [isMuted, isActive]);

    // [SOLUÇÃO: Autoplay Web] Controla play/pause quando o card vira ativo/inativo.
    useEffect(() => {
        const el = videoRef.current;
        if (!el) return;

        if (isActive) {
            // No web, autoplay costuma funcionar se estiver mutado inicialmente.
            // Se o usuário já interagiu (clicou), o play() com som também funcionará.
            const play = async () => {
                try {
                    await el.play();
                    // No web, se conseguimos dar play com sucesso (mesmo mutado), chamamos onReady
                    if (onReady) onReady();
                } catch (err) {
                    if (__DEV__) console.warn('Falha ao dar play no vídeo (web) no isActive:', err);
                    // Mesmo com erro de autoplay, chamamos onReady se os dados já carregaram
                    // readyState >= 2 significa HAVE_CURRENT_DATA (pode tocar o frame atual)
                    if (el.readyState >= 2 && onReady) onReady();
                }
            };
            void play();
        } else {
            el.pause();
            if (onProgressUpdate) onProgressUpdate(0);
        }
    }, [isActive, onProgressUpdate, onReady]);

    useEffect(() => {
        if (!isActive && onProgressUpdate) onProgressUpdate(0);
    }, [isActive, onProgressUpdate]);

    return (
        <View style={styles.image}>
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video
                ref={videoRef}
                src={url}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                autoPlay={isActive}
                muted={isMuted}
                playsInline
                onLoadedData={() => {
                    if (onReady) onReady();
                }}
                onLoadedMetadata={() => {
                    if (onReady) onReady();
                }}
                onCanPlay={() => {
                    if (onReady) onReady();
                }}
                onError={(e) => {
                    if (onError) onError(e);
                    if (onProgressUpdate) onProgressUpdate(0);
                }}
                onTimeUpdate={(e) => {
                    const target = e.currentTarget;
                    if (onProgressUpdate && target.duration > 0) {
                        onProgressUpdate(target.currentTime / target.duration);
                    }
                }}
            />
        </View>
    );
};

// --- Componente exclusivo para Nativo (iOS/Android) ---
const VideoViewWrapperNative: React.FC<VideoViewWrapperProps> = ({
    url, isActive, isMuted, onReady, onError, onProgressUpdate
}) => {
    const player = useVideoPlayer(url, (p) => {
        p.loop = false;
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

// --- Componente de despacho (sem hooks, apenas seleção de plataforma) ---
const VideoViewWrapper: React.FC<VideoViewWrapperProps> = (props) => {
    if (Platform.OS === 'web') {
        return <VideoViewWrapperWeb {...props} />;
    }
    return <VideoViewWrapperNative {...props} />;
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
        zIndex: 30, // Aumentado para garantir interatividade sobre outros elementos
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        borderRadius: radius.full,
        padding: 8, // Ligeiramente maior para facilitar o toque/clique
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
