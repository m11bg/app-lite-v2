import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text, Avatar } from 'react-native-paper';
import { colors, spacing } from '@/styles/theme';
import { toPrestadorResumo, userToPrestadorResumo } from '@/types/profilePreview';
import { OfertaServico } from '@/types/oferta';

interface OfferDetailsProps {
    item: OfertaServico;
    categoria: string;
    titulo: string;
    descricao: string;
    formattedPrice: string;
    unidadePreco: string;
    prestadorNome: string;
    cidade: string;
    avatarUri?: string;
    currentUser: any;
    showProfile: (res: any) => void;
    onPress?: () => void;
    strings: any;
}

export const OfferDetails: React.FC<OfferDetailsProps> = ({
    item,
    categoria,
    titulo,
    descricao,
    formattedPrice,
    unidadePreco,
    prestadorNome,
    cidade,
    avatarUri,
    currentUser,
    showProfile,
    onPress,
    strings,
}) => {
    return (
        <Pressable
            style={styles.contentContainer}
            onPress={onPress}
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
                <Pressable
                    style={styles.prestadorInfo}
                    onPress={(e) => {
                        if (typeof e?.stopPropagation === 'function') e.stopPropagation();
                        
                        const prestadorId = item.prestador._id;
                        const isMe = currentUser && (currentUser.id === prestadorId);
                        
                        const res = isMe 
                            ? userToPrestadorResumo(currentUser) 
                            : toPrestadorResumo(item.prestador, item.localizacao);
                            
                        showProfile(res);
                    }}
                    accessible
                    accessibilityLabel={`${strings.ACCESSIBILITY.PROVIDER_PREFIX} ${prestadorNome} de ${cidade}`}
                    accessibilityRole="button"
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
                </Pressable>

                <View style={styles.priceContainer} accessibilityLabel={`${strings.ACCESSIBILITY.PRICE_PREFIX} ${formattedPrice} por ${unidadePreco}`} accessibilityRole="text">
                    <Text variant="titleLarge" style={styles.price} numberOfLines={1} ellipsizeMode="tail">
                        {formattedPrice}
                    </Text>
                    <Text variant="labelSmall" style={styles.priceUnit} numberOfLines={1} ellipsizeMode="tail">
                        /{unidadePreco}
                    </Text>
                </View>
            </View>
        </Pressable>
    );
};

const styles = StyleSheet.create({
    contentContainer: {
        padding: spacing.md,
        paddingBottom: spacing.lg,
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
