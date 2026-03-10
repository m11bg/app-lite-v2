import React, { memo, useCallback, useMemo, useState, useEffect } from 'react';
import { StyleSheet, useWindowDimensions, Platform, Animated } from 'react-native';
import { Card } from 'react-native-paper';
import { toAbsoluteMediaUrls } from '@/utils/mediaUrl';
import { OfertaServico } from '@/types/oferta';
import { colors, radius, layout } from '@/styles/theme';
import { OFFER_TRANSLATIONS } from '@/constants/translations';
import { useSwiperIndex } from '@/context/SwiperIndexContext';
import { useProfilePreviewActions } from '@/context/ProfilePreviewContext';
import { useAuth } from '@/context/AuthContext';
import { OfferMedia, MediaItem } from './OfferMedia';
import { OfferDetails } from './OfferDetails';

interface OfferSwipeCardProps {
    item: OfertaServico;
    isActiveCard?: boolean;
    index?: number;
    accessibilityHint?: string;
    isMuted?: boolean;
    onToggleMute?: () => void;
    onPress?: () => void;
}

const priceFormatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
});

let mediaNavigationHintDismissed = false;

const OfferSwipeCard: React.FC<OfferSwipeCardProps> = ({ item, isActiveCard, index, accessibilityHint, isMuted: propsMuted, onToggleMute: propsToggleMute, onPress }) => {
    const { width: windowWidth, height: windowHeight } = useWindowDimensions();
    const { showProfile } = useProfilePreviewActions();
    const { user: currentUser } = useAuth();
    
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

    const cardWidth = useMemo(() => {
        const safeWidth = Number.isFinite(windowWidth) && windowWidth > 0 ? windowWidth : (layout?.cardWidthFallback ?? 375);
        const clamped = Math.max(layout?.minScreenWidth ?? 320, safeWidth);
        return clamped * (layout?.cardWidthRatio ?? 0.9);
    }, [windowWidth]);

    const cardMaxHeight = useMemo(() => {
        const reservedSpace = Platform.select({ ios: 240, android: 220, default: 230 });
        const calculated = windowHeight - reservedSpace;
        return Math.max(380, calculated);
    }, [windowHeight]);

    const effectiveMediaWidth = useMemo(() => {
        const fallback = Math.min(cardWidth, 600);
        if (Platform.OS === 'web') {
            return mediaWidth > 0 ? mediaWidth : fallback;
        }
        return mediaWidth || cardWidth;
    }, [cardWidth, mediaWidth]);

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

    const onMediaLayout = useCallback((e: any) => {
        const nextWidth = e.nativeEvent.layout.width;
        if (Number.isFinite(nextWidth) && nextWidth > 0) {
            setMediaWidth(nextWidth);
        }
    }, []);

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

    return (
        <Card
            style={[styles.card, { width: cardWidth, maxHeight: cardMaxHeight }]}
            mode="elevated"
            accessible
            accessibilityLabel={`Oferta: ${titulo} em ${cidade}`}
            accessibilityHint={accessibilityHint || strings.ACCESSIBILITY.HINT}
            testID="offer-swipe-card"
        >
            <OfferMedia 
                allMedia={allMedia}
                currentMediaIndex={currentMediaIndex}
                setCurrentMediaIndex={setCurrentMediaIndex}
                isActive={computedIsActive}
                isMuted={isMuted}
                onToggleMute={onToggleMute}
                mediaLoaded={mediaLoaded}
                setMediaLoaded={setMediaLoaded}
                videoProgress={videoProgress}
                setVideoProgress={setVideoProgress}
                videoErrored={videoErrored}
                setVideoErrored={setVideoErrored}
                imageErrored={imageErrored}
                setImageErrored={setImageErrored}
                effectiveMediaWidth={effectiveMediaWidth}
                onMediaLayout={onMediaLayout}
                triggerFlash={triggerFlash}
                leftFlashAnim={leftFlashAnim}
                rightFlashAnim={rightFlashAnim}
                centerFlashAnim={centerFlashAnim}
                accessibilityImageLabel={`${strings.ACCESSIBILITY.IMAGE_PREFIX} ${titulo}`}
                strings={strings}
            />

            <OfferDetails 
                item={item}
                categoria={categoria}
                titulo={titulo}
                descricao={descricao}
                formattedPrice={formattedPrice}
                unidadePreco={unidadePreco}
                prestadorNome={prestadorNome}
                cidade={cidade}
                avatarUri={avatarUri}
                currentUser={currentUser}
                showProfile={showProfile}
                onPress={onPress}
                strings={strings}
            />
        </Card>
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
                boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
            },
        }),
        alignSelf: 'center',
        maxWidth: 600,
    },
});

const areEqual = (prev: OfferSwipeCardProps, next: OfferSwipeCardProps) => {
    if (!prev.item || !next.item) return prev.item === next.item;
    return (
        prev.item._id === next.item._id &&
        prev.item.preco === next.item.preco &&
        prev.item.unidadePreco === next.item.unidadePreco &&
        prev.item.titulo === next.item.titulo &&
        prev.item.descricao === next.item.descricao &&
        prev.item.categoria === next.item.categoria &&
        prev.index === next.index &&
        prev.isMuted === next.isMuted &&
        prev.onPress === next.onPress
    );
};

export default memo(OfferSwipeCard, areEqual);
