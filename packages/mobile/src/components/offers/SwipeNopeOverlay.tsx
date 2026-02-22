/**
 * @file SwipeNopeOverlay.tsx
 * @description Componente visual de sobreposição para ações de rejeição (Nope) em cards de ofertas.
 */

import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
// Importação de tokens de design do tema global
import { colors, radius } from '@/styles/theme';
import { OFFER_TRANSLATIONS } from '@/constants/translations';

/**
 * Props para o componente SwipeNopeOverlay
 */
interface SwipeNopeOverlayProps {
    /** Tamanho do ícone (padrão: 80) */
    iconSize?: number;
    /** Texto a ser exibido (padrão: 'NÃO') */
    label?: string;
}

/**
 * Componente SwipeNopeOverlay
 * 
 * Exibido como um feedback visual quando o usuário desliza um card para a esquerda (rejeição).
 * Renderiza um ícone de 'X' e o texto "NÃO" centralizados com um fundo avermelhado.
 * 
 * @component
 */
const SwipeNopeOverlay: React.FC<SwipeNopeOverlayProps> = ({ 
    iconSize = 80, 
    label = OFFER_TRANSLATIONS.OVERLAYS.NOPE
}) => (
    <View 
        style={[styles.container, StyleSheet.absoluteFillObject]} 
        pointerEvents="none"
        accessibilityRole="image"
        accessibilityLabel={OFFER_TRANSLATIONS.OVERLAYS.ACCESSIBILITY_NOPE}
    >
        {/* Ícone de fechar para indicar visualmente a rejeição */}
        <Icon name="close" size={iconSize} color={colors.error} />
        {/* Texto em destaque para confirmar a intenção de "NÃO" */}
        <Text variant="headlineLarge" style={styles.text}>{label}</Text>
    </View>
);

/**
 * Estilização do componente SwipeNopeOverlay
 */
const styles = StyleSheet.create({
    container: {
        flex: 1,
        // Centraliza o ícone e o texto vertical e horizontalmente
        justifyContent: 'center',
        alignItems: 'center',
        // Fundo vermelho com opacidade reduzida para não bloquear totalmente a visão do card
        backgroundColor: 'rgba(244, 67, 54, 0.3)',
        // Aplica o arredondamento padrão definido no tema
        borderRadius: radius.lg,
    },
    text: {
        // Utiliza a cor de erro do tema para manter a consistência visual
        color: colors.error,
        fontWeight: 'bold',
        marginTop: 8,
    },
});

export default memo(SwipeNopeOverlay);
