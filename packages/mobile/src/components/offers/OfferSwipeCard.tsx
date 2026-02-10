import React, { memo, useCallback, useMemo, useState, useEffect } from 'react';
import { View, StyleSheet, useWindowDimensions, Platform, Pressable, LayoutChangeEvent, GestureResponderEvent } from 'react-native';
import { Card, Text, Avatar } from 'react-native-paper';
import { Image } from 'expo-image';
import { VideoView, useVideoPlayer } from 'expo-video';
import MediaProgressIndicator from '@/components/offers/MediaProgressIndicator';
import { toAbsoluteMediaUrls } from '@/utils/mediaUrl';
import { OfertaServico } from '@/types/oferta';
import { colors, spacing, radius, layout } from '@/styles/theme';

interface OfferSwipeCardProps {
    item: OfertaServico;
    isActiveCard: boolean;
    accessibilityHint?: string;
}

type MediaItem = { type: 'image' | 'video'; url: string };

type OfferCardI18n = {
    fallbacks: {
        title: string;
        description: string;
        city: string;
        provider: string;
        priceUnit: string;
        imageText: string;
    };
    accessibility: {
        hint: string;
        categoryPrefix: string;
        titlePrefix: string;
        descriptionPrefix: string;
        pricePrefix: string;
        imagePrefix: string;
        providerPrefix: string;
    };
};

const offerCardStrings: OfferCardI18n = {
    fallbacks: {
        title: 'Serviço não informado',
        description: 'Descrição não informada',
        city: 'Cidade não informada',
        provider: 'Prestador',
        priceUnit: 'unidade',
        imageText: 'Oferta',
    },
    accessibility: {
        hint: 'Abre os detalhes da oferta',
        categoryPrefix: 'Categoria',
        titlePrefix: 'Título',
        descriptionPrefix: 'Descrição',
        pricePrefix: 'Preço',
        imagePrefix: 'Imagem da oferta',
        providerPrefix: 'Prestador',
    },
};

const FALLBACK_IMAGE = 'https://via.placeholder.com/800x600?text=Oferta';
const PLACEHOLDER_BLURHASH = 'L5H2EC=PM+yV0g-mq.wG9c010J}I';

const priceFormatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
});

const useOfferCardI18n = () => useMemo(() => offerCardStrings, []);

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
const OfferSwipeCard: React.FC<OfferSwipeCardProps> = ({ item, isActiveCard, accessibilityHint }) => {
    const { width: windowWidth } = useWindowDimensions();
    const [imageErrored, setImageErrored] = useState(false);
    const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
    const [mediaWidth, setMediaWidth] = useState(0);
    const strings = useOfferCardI18n();

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

    // placeholder: manter referência de fallback quando não houver mídias válidas
    const hasMedia = allMedia.length > 0;

    const precoNumber = typeof item?.preco === 'number' ? item.preco : Number(item?.preco ?? 0);
    const safePrice = Number.isFinite(precoNumber) && precoNumber >= 0 ? precoNumber : 0;

    const formattedPrice = useMemo(() => priceFormatter.format(safePrice), [safePrice]);

    const categoria = useMemo(() => (item?.categoria?.trim() || strings.fallbacks.imageText).toUpperCase(), [item?.categoria, strings.fallbacks.imageText]);
    const titulo = item?.titulo?.trim() || strings.fallbacks.title;
    const descricao = item?.descricao?.trim() || strings.fallbacks.description;
    const unidadePreco = item?.unidadePreco?.trim() || strings.fallbacks.priceUnit;
    const prestadorNome = item?.prestador?.nome?.trim() || strings.fallbacks.provider;
    const cidade = item?.localizacao?.cidade?.trim() || strings.fallbacks.city;
    const avatarUri = item?.prestador?.avatar;

    const accessibilityCardLabel = useMemo(() => `Oferta: ${titulo} em ${cidade}`, [titulo, cidade]);
    const accessibilityImageLabel = useMemo(
        () => `${strings.accessibility.imagePrefix} ${titulo}`,
        [strings.accessibility.imagePrefix, titulo],
    );
    const accessibilityPrestadorLabel = useMemo(
        () => `${strings.accessibility.providerPrefix} ${prestadorNome} de ${cidade}`,
        [strings.accessibility.providerPrefix, prestadorNome, cidade],
    );
    const accessibilityPriceLabel = useMemo(
        () => `${strings.accessibility.pricePrefix} ${formattedPrice} por ${unidadePreco}`,
        [formattedPrice, strings.accessibility.pricePrefix, unidadePreco],
    );

    const handleImageError = useCallback(() => setImageErrored(true), []);

    const onMediaLayout = useCallback((e: LayoutChangeEvent) => {
        setMediaWidth(e.nativeEvent.layout.width || 0);
    }, []);

    const handleMediaPress = useCallback((event: GestureResponderEvent) => {
        const x = event.nativeEvent?.locationX ?? 0;
        const width = mediaWidth || cardWidth;
        if (!width || width <= 0) return;
        const left = width / 3;
        const right = (2 * width) / 3;
        if (x < left) {
            setCurrentMediaIndex((prev) => Math.max(0, prev - 1));
        } else if (x > right) {
            setCurrentMediaIndex((prev) => Math.min(allMedia.length - 1, prev + 1));
        } else {
            // centro: reservado para toggle de som (futuro)
        }
    }, [mediaWidth, cardWidth, allMedia.length]);

    // Resetar mídia quando o card deixar de ser ativo e quando o item mudar
    useEffect(() => {
        if (!isActiveCard) setCurrentMediaIndex(0);
    }, [isActiveCard]);

    useEffect(() => {
        setCurrentMediaIndex(0);
        setImageErrored(false);
    }, [item?._id]);

    useEffect(() => {
        setImageErrored(false);
    }, [currentMediaIndex]);

    return (
        <Card
            style={[styles.card, { width: cardWidth }]}
            mode="elevated"
            accessible
            accessibilityRole="button"
            accessibilityLabel={accessibilityCardLabel}
            accessibilityHint={accessibilityHint || strings.accessibility.hint}
            testID="offer-swipe-card"
        >
            <Pressable
                style={styles.imageContainer}
                onPress={handleMediaPress}
                onLayout={onMediaLayout}
                accessibilityRole="image"
                accessibilityLabel={accessibilityImageLabel}
                accessibilityHint="Toque à esquerda/direita para navegar entre as mídias"
            >
                <MediaProgressIndicator count={allMedia.length} currentIndex={currentMediaIndex} />
                {currentMedia ? (
                    currentMedia.type === 'video' ? (
                        <VideoViewWrapper url={currentMedia.url} isActive={isActiveCard} />
                    ) : (
                        <Image
                            source={{ uri: imageErrored ? FALLBACK_IMAGE : currentMedia.url }}
                            style={styles.image}
                            contentFit="cover"
                            transition={300}
                            accessibilityLabel={accessibilityImageLabel}
                            accessibilityIgnoresInvertColors={false}
                            placeholder={PLACEHOLDER_BLURHASH}
                            onError={handleImageError}
                        />
                    )
                ) : (
                    <Image
                        source={{ uri: FALLBACK_IMAGE }}
                        style={styles.image}
                        contentFit="cover"
                        transition={300}
                        accessibilityLabel={accessibilityImageLabel}
                        accessibilityIgnoresInvertColors={false}
                        placeholder={PLACEHOLDER_BLURHASH}
                    />
                )}
            </Pressable>

            <View style={styles.contentContainer}>
                <View style={styles.headerSection}>
                    <Text
                        variant="labelSmall"
                        style={styles.categoryLabel}
                        accessibilityLabel={`${strings.accessibility.categoryPrefix} ${categoria}`}
                        accessibilityRole="text"
                    >
                        {categoria}
                    </Text>
                    <Text
                        variant="titleLarge"
                        style={styles.title}
                        numberOfLines={2}
                        ellipsizeMode="tail"
                        accessibilityLabel={`${strings.accessibility.titlePrefix} ${titulo}`}
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
                        accessibilityLabel={`${strings.accessibility.descriptionPrefix} ${descricao}`}
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
const VideoViewWrapper: React.FC<{ url: string; isActive: boolean }> = ({ url, isActive }) => {
    const player = useVideoPlayer(url, (p) => {
        p.loop = true;
        p.muted = true;
    });

    useEffect(() => {
        try {
            if (isActive) player.play(); else player.pause();
        } catch {}
    }, [isActive, player, url]);

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
    contentContainer: {
        flex: 1,
        padding: spacing.md,
        justifyContent: 'space-between',
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
        flex: 1,
        justifyContent: 'center',
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
        prev.isActiveCard === next.isActiveCard
    );
};

/**
 * Exportação otimizada do componente utilizando React.memo para evitar re-renderizações desnecessárias
 * enquanto o usuário navega entre os cartões de oferta.
 */
export default memo(OfferSwipeCard, areEqual);
