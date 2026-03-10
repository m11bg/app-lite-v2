import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, useWindowDimensions, Platform } from 'react-native';
import { vibrateLight } from '@/utils/haptics';
import { Text, Button, Snackbar, IconButton } from 'react-native-paper';
import { Swiper } from 'rn-swiper-list';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { OfertasStackParamList } from '@/types';
import { OfertaServico } from '@/types/oferta';
import OfferSwipeCard from '@/components/offers/OfferSwipeCard';
import OfferSwipeCardSkeleton from '@/components/offers/OfferSwipeCardSkeleton';
import SwipeLikeOverlay from '@/components/offers/SwipeLikeOverlay';
import SwipeNopeOverlay from '@/components/offers/SwipeNopeOverlay';
import SwipeSkipOverlay from '@/components/offers/SwipeSkipOverlay';
import { useOfertaSwipe } from '@/hooks/useOfertaSwipe';
import { colors, spacing, radius, layout } from '@/styles/theme';
import { OFFER_TRANSLATIONS } from '@/constants/translations';
import { SwiperIndexProvider } from '@/context/SwiperIndexContext';

/**
 * Tela principal de exibição de ofertas no formato de "swipe" (cartões deslizáveis).
 */
const SwipeOfertasScreen: React.FC = () => {
    const {
        ofertas,
        isInitialLoading,
        isPaging,
        isRefreshing,
        error,
        isEmpty,
        currentIndex,
        resetCount,
        swiperRef,
        handleSwipeRight,
        handleSwipeLeft,
        handleSwipeTop,
        handleSwipedAll,
        handleUndo,
        handleRefresh,
        handleRetry,
        setCurrentIndex,
        setError,
    } = useOfertaSwipe();

    const [isMuted, setIsMuted] = useState(true);
    const toggleMute = useCallback(() => setIsMuted((prev) => !prev), []);

    const navigation = useNavigation<NativeStackNavigationProp<OfertasStackParamList>>();
    const { width: windowWidth } = useWindowDimensions();
    const insets = useSafeAreaInsets();
    const fallbackWidth = Math.max(layout.cardWidthFallback, layout.minScreenWidth);
    const cardWidth = Math.max(windowWidth || fallbackWidth, layout.minScreenWidth) * layout.cardWidthRatio;

    // Configura as opções de navegação do cabeçalho com referência estável para evitar re-render desnecessário
    const headerRight = useCallback(
        () => (
            <IconButton
                icon="format-list-bulleted"
                onPress={() => navigation.navigate('BuscarOfertas')}
                accessibilityLabel={OFFER_TRANSLATIONS.ACTIONS.SWITCH_TO_LIST}
                accessibilityRole="button"
            />
        ),
        [navigation]
    );

    useEffect(() => {
         navigation.setOptions({ headerRight });
     }, [headerRight, navigation]);

    /**
     * Renderiza a carta de oferta mantendo referência estável para evitar re-render no Swiper.
     *
     * @param {OfertaServico} item Oferta a ser exibida na carta.
     * @returns {React.JSX.Element} Componente de carta de oferta.
     */
    const renderCard = useCallback(
        (item: OfertaServico, index: number) => (
            <OfferSwipeCard
                item={item}
                index={index}
                isMuted={isMuted}
                onToggleMute={toggleMute}
                onPress={() => navigation.navigate('OfferDetail', { oferta: item })}
            />
        ),
        [isMuted, toggleMute, navigation]
    );
    /**
     * Renderiza o overlay de like com callback estável para o Swiper.
     *
     * @returns {React.JSX.Element} Componente de overlay de like.
     */
    const renderLikeOverlay = useCallback(() => <SwipeLikeOverlay />, []);
    /**
     * Renderiza o overlay de dislike com callback estável para o Swiper.
     *
     * @returns {React.JSX.Element} Componente de overlay de dislike.
     */
    const renderNopeOverlay = useCallback(() => <SwipeNopeOverlay />, []);
    /**
     * Renderiza o overlay de skip com callback estável para o Swiper.
     *
     * @returns {React.JSX.Element} Componente de overlay de skip.
     */
    const renderSkipOverlay = useCallback(() => <SwipeSkipOverlay />, []);

    // Handlers estáveis para os botões de ação — evitam criação de closures inline repetidas
    const handleDislikePress = useCallback(() => {
        vibrateLight();
        swiperRef.current?.swipeLeft();
    }, [swiperRef]);

    const handleSkipPress = useCallback(() => {
        vibrateLight();
        swiperRef.current?.swipeTop();
    }, [swiperRef]);

    const handleLikePress = useCallback(() => {
        vibrateLight();
        swiperRef.current?.swipeRight();
    }, [swiperRef]);

    // Exibe esqueleto de carregamento enquanto busca dados iniciais
    if (isInitialLoading && ofertas.length === 0) {
        return (
            <View style={styles.centerContainer}>
                <View style={styles.skeletonWrapper}>
                    {/* Simulando cards atrás para dar profundidade e efeito de deck */}
                    <View 
                        style={[
                            styles.skeletonCardBehind, 
                            { 
                                width: cardWidth * 0.9, 
                                transform: [{ translateY: 20 }, { scale: 0.9 }],
                                opacity: 0.3
                            }
                        ]} 
                    />
                    <View 
                        style={[
                            styles.skeletonCardBehind, 
                            { 
                                width: cardWidth * 0.95, 
                                transform: [{ translateY: 10 }, { scale: 0.95 }],
                                opacity: 0.6
                            }
                        ]} 
                    />
                    <OfferSwipeCardSkeleton />
                </View>
                
                <View style={styles.loadingInfo}>
                    <Text variant="bodyMedium" style={styles.loadingText}>
                        {OFFER_TRANSLATIONS.SCREEN.LOADING}
                    </Text>
                </View>
            </View>
        );
    }

    // Renderiza uma mensagem informativa e botão de recarregar quando não há ofertas disponíveis
    if (isEmpty) {
        return (
            <View style={styles.centerContainer}>
                <Icon name="cards-outline" size={80} color={colors.onSurfaceVariant} accessibilityLabel={OFFER_TRANSLATIONS.SCREEN.EMPTY_TITLE} />
                <Text variant="headlineSmall" style={styles.emptyTitle}>
                    {OFFER_TRANSLATIONS.SCREEN.EMPTY_TITLE}
                </Text>
                <Text variant="bodyMedium" style={styles.emptyText}>
                    {OFFER_TRANSLATIONS.SCREEN.EMPTY_TEXT}
                </Text>
                <Button
                    mode="contained"
                    onPress={handleRefresh}
                    style={styles.refreshButton}
                    loading={isRefreshing}
                    accessibilityLabel={OFFER_TRANSLATIONS.SCREEN.REFRESH_BUTTON}
                    accessibilityRole="button"
                >
                    {OFFER_TRANSLATIONS.SCREEN.REFRESH_BUTTON}
                </Button>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.swiperArea}>
                <SwiperIndexProvider value={currentIndex}>
                    <Swiper
                        key={`swiper-deck-${resetCount}`}
                        ref={swiperRef}
                        data={ofertas}
                        renderCard={renderCard}
                        OverlayLabelRight={renderLikeOverlay}
                        OverlayLabelLeft={renderNopeOverlay}
                        OverlayLabelTop={renderSkipOverlay}
                        onSwipeRight={handleSwipeRight}
                        onSwipeLeft={handleSwipeLeft}
                        onSwipeTop={handleSwipeTop}
                        onSwipedAll={handleSwipedAll}
                        onIndexChange={setCurrentIndex}
                        prerenderItems={5}
                        keyExtractor={(item: OfertaServico, index: number) => (item as any)?._id ?? (item as any)?.id ?? index}
                        cardStyle={[styles.cardContainer, { width: cardWidth }]}
                    />
                </SwiperIndexProvider>
            </View>

            {/* Barra inferior de ações flutuando no rodapé */}
            {/* pointerEvents="box-none" evita que o container bloqueie toques no Swiper abaixo dele */}
            <View
                style={[styles.actionsContainer, { paddingBottom: Math.max(insets.bottom, spacing.md), pointerEvents: 'box-none' }]}
            >
                {/* Botão para descartar a oferta (Swipe Left) */}
                <IconButton
                    icon="close"
                    size={40}
                    iconColor={colors.error}
                    mode="outlined"
                    onPressIn={Platform.OS === 'web' ? handleDislikePress : undefined}
                    onPress={Platform.OS !== 'web' ? handleDislikePress : undefined}
                    style={styles.actionButton}
                    hitSlop={10}
                    accessibilityLabel={OFFER_TRANSLATIONS.ACTIONS.DISLIKE}
                />

                {/* Botão para desfazer o último movimento */}
                <IconButton
                    icon="arrow-down"
                    size={40}
                    iconColor={colors.primary}
                    mode="outlined"
                    onPressIn={Platform.OS === 'web' ? handleUndo : undefined}
                    onPress={Platform.OS !== 'web' ? handleUndo : undefined}
                    disabled={currentIndex === 0}
                    style={[
                        styles.actionButton,
                        currentIndex === 0 && { opacity: 0.5 }
                    ]}
                    hitSlop={10}
                    accessibilityLabel={OFFER_TRANSLATIONS.ACTIONS.UNDO}
                />

                {/* Botão para pular a oferta (Swipe Top) - Centralizado */}
                <IconButton
                    icon="arrow-up"
                    size={40}
                    iconColor={colors.primary}
                    mode="outlined"
                    onPressIn={Platform.OS === 'web' ? handleSkipPress : undefined}
                    onPress={Platform.OS !== 'web' ? handleSkipPress : undefined}
                    style={styles.actionButton}
                    hitSlop={10}
                    accessibilityLabel={OFFER_TRANSLATIONS.ACTIONS.SKIP}
                />

                {/* Botão para curtir a oferta (Swipe Right) */}
                <IconButton
                    icon="heart"
                    size={40}
                    iconColor={colors.success}
                    mode="outlined"
                    onPressIn={Platform.OS === 'web' ? handleLikePress : undefined}
                    onPress={Platform.OS !== 'web' ? handleLikePress : undefined}
                    style={styles.actionButton}
                    hitSlop={10}
                    accessibilityLabel={OFFER_TRANSLATIONS.ACTIONS.LIKE}
                />
            </View>

            {isPaging && (
                <View style={styles.pagingIndicator}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text variant="bodySmall" style={styles.loadingText}>
                        {OFFER_TRANSLATIONS.SCREEN.PAGING_INDICATOR}
                    </Text>
                </View>
            )}

            <Snackbar
                visible={!!error}
                onDismiss={() => setError(null)}
                action={{
                    label: OFFER_TRANSLATIONS.SCREEN.RETRY_LABEL,
                    onPress: handleRetry,
                }}
            >
                {error}
            </Snackbar>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
        backgroundColor: colors.background,
    },
    loadingText: {
        color: colors.onSurfaceVariant,
    },
    loadingInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginTop: spacing.xl,
    },
    skeletonWrapper: {
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.lg,
    },
    skeletonCardBehind: {
        position: 'absolute',
        aspectRatio: 16 / 14, // Proporção aproximada do card completo
        backgroundColor: colors.surface,
        borderRadius: radius.xl,
        borderWidth: 1,
        borderColor: colors.border,
    },
    emptyTitle: {
        marginTop: spacing.md,
        color: colors.onSurface,
        textAlign: 'center',
    },
    emptyText: {
        marginTop: spacing.sm,
        color: colors.onSurfaceVariant,
        textAlign: 'center',
    },
    refreshButton: {
        marginTop: spacing.lg,
    },
    cardContainer: {
        alignSelf: 'center',
        // Removido marginBottom e relying na centralização do swiperArea
    },
    actionsContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: spacing.lg,
        paddingBottom: spacing.xl,
        gap: spacing.md,
        backgroundColor: 'transparent',
        zIndex: 1000, // Garante que a barra de ações fique acima do Swiper na web
        elevation: 10, // Garante que fique acima no Android
    },
    actionButton: {
        backgroundColor: colors.surface,
        elevation: 2,
    },

    swiperArea: {
        flex: 1,
        width: '100%',
        justifyContent: 'flex-start',
        alignItems: 'center',
        paddingTop: spacing.lg,
        paddingBottom: 120, // Reserva espaço para os botões de ação não sobreporem o card
    },
    pagingIndicator: {
        position: 'absolute',
        bottom: spacing.xl + spacing.md,
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
});

export default SwipeOfertasScreen;

