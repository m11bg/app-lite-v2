import React from 'react';
import { View, StyleSheet, useWindowDimensions, Platform } from 'react-native';
import { Card } from 'react-native-paper';
import { SkeletonBox, SkeletonGroup } from '@/components/profile/skeletons/SkeletonPrimitives';
import { colors, spacing, radius, layout } from '@/styles/theme';

/**
 * Componente que renderiza um esqueleto de carregamento (Skeleton Screen) 
 * que mimetiza o layout do OfferSwipeCard.
 * 
 * @component
 */
const OfferSwipeCardSkeleton: React.FC = () => {
    const { width: windowWidth, height: windowHeight } = useWindowDimensions();

    const cardWidth = React.useMemo(() => {
        const safeWidth = Number.isFinite(windowWidth) && windowWidth > 0 ? windowWidth : (layout?.cardWidthFallback ?? 375);
        const clamped = Math.max(layout?.minScreenWidth ?? 320, safeWidth);
        return clamped * (layout?.cardWidthRatio ?? 0.9);
    }, [windowWidth]);

    const cardMaxHeight = React.useMemo(() => {
        // Segue a mesma lógica do OfferSwipeCard para manter consistência no deck
        // Reserva espaço para evitar sobreposição (Header + Status + Actions + Margens)
        const reservedSpace = Platform.select({ ios: 240, android: 220, default: 230 });
        const calculated = windowHeight - reservedSpace;
        return Math.max(380, calculated);
    }, [windowHeight]);

    return (
        <Card
            style={[styles.card, { width: cardWidth, maxHeight: cardMaxHeight }]}
            mode="elevated"
            testID="offer-swipe-card-skeleton"
        >
            <SkeletonGroup>
                {/* Image Placeholder */}
                <View style={styles.imageContainer}>
                    <SkeletonBox width="100%" height="100%" radius={0} />
                </View>

                <View style={styles.contentContainer}>
                    <View style={styles.headerSection}>
                        {/* Categoria */}
                        <SkeletonBox width={80} height={10} style={{ marginBottom: 6 }} />
                        {/* Título - Linha 1 */}
                        <SkeletonBox width="90%" height={24} style={{ marginBottom: 4 }} />
                        {/* Título - Linha 2 (opcional) */}
                        <SkeletonBox width="60%" height={24} />
                    </View>

                    <View style={styles.descriptionSection}>
                        {/* Descrição - 3 linhas */}
                        <SkeletonBox width="100%" height={14} style={{ marginBottom: 6 }} />
                        <SkeletonBox width="100%" height={14} style={{ marginBottom: 6 }} />
                        <SkeletonBox width="80%" height={14} />
                    </View>

                    <View style={styles.footerSection}>
                        <View style={styles.prestadorInfo}>
                            {/* Avatar */}
                            <SkeletonBox width={36} height={36} radius={18} />
                            <View style={styles.prestadorText}>
                                {/* Nome */}
                                <SkeletonBox width={100} height={14} style={{ marginBottom: 4 }} />
                                {/* Localização */}
                                <SkeletonBox width={70} height={12} />
                            </View>
                        </View>

                        <View style={styles.priceContainer}>
                            {/* Preço */}
                            <SkeletonBox width={80} height={24} style={{ marginBottom: 2 }} />
                            {/* Unidade */}
                            <SkeletonBox width={40} height={10} />
                        </View>
                    </View>
                </View>
            </SkeletonGroup>
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
    imageContainer: {
        width: '100%',
        aspectRatio: 16 / 10,
        backgroundColor: colors.border,
    },
    contentContainer: {
        padding: spacing.md,
        paddingBottom: spacing.lg, // Paridade com o card real
        gap: spacing.sm,
    },
    headerSection: {
        marginBottom: spacing.xs,
    },
    descriptionSection: {
        marginVertical: spacing.xs,
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
    priceContainer: {
        alignItems: 'flex-end',
        flexShrink: 0,
        minWidth: 80,
    },
});

export default OfferSwipeCardSkeleton;
