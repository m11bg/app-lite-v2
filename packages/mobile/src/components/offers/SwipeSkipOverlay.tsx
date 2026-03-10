import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, radius } from '@/styles/theme';
import { OFFER_TRANSLATIONS } from '@/constants/translations';

/**
 * Props para o componente SwipeSkipOverlay
 */
interface SwipeSkipOverlayProps {
    /** Tamanho do ícone (padrão: 80) */
    iconSize?: number;
    /** Texto a ser exibido (padrão: 'PULAR') */
    label?: string;
}

/**
 * Componente SwipeSkipOverlay
 * 
 * Este componente é exibido como um overlay visual sobre um card de oferta
 * quando o usuário realiza um gesto de deslize (swipe) para cima,
 * indicando uma ação de pular/ignorar sem tomar decisão.
 * 
 * @component
 */
const SwipeSkipOverlay: React.FC<SwipeSkipOverlayProps> = ({ 
    iconSize = 80, 
    label = OFFER_TRANSLATIONS.OVERLAYS.SKIP
}) => (
    <View
        style={[styles.container, StyleSheet.absoluteFillObject, { pointerEvents: 'none' }]}
        accessibilityRole="image"
        accessibilityLabel={OFFER_TRANSLATIONS.OVERLAYS.ACCESSIBILITY_SKIP}
    >
        {/* Ícone de seta para cima representando a ação de 'Skip' */}
        <Icon name="arrow-up-bold" size={iconSize} color={colors.primary} />
        
        {/* Texto de feedback visual em destaque */}
        <Text variant="headlineLarge" style={styles.text}>{label}</Text>
    </View>
);

/**
 * Estilos para o componente SwipeSkipOverlay
 * Define a aparência do container semitransparente e a tipografia do texto.
 */
const styles = StyleSheet.create({
    container: {
        flex: 1,
        // Centraliza o conteúdo horizontal e verticalmente
        justifyContent: 'center',
        alignItems: 'center',
        // Fundo primário com opacidade para permitir ver a oferta por baixo
        backgroundColor: 'rgba(33, 150, 243, 0.3)',
        // Aplica o raio de borda definido no tema global
        borderRadius: radius.lg,
    },
    text: {
        // Cor primária definida no tema
        color: colors.primary,
        fontWeight: 'bold',
        marginTop: 8,
    },
});

export default memo(SwipeSkipOverlay);
