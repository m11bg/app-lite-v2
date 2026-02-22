import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, radius } from '@/styles/theme';
import { OFFER_TRANSLATIONS } from '@/constants/translations';

/**
 * Props para o componente SwipeLikeOverlay
 */
interface SwipeLikeOverlayProps {
    /** Tamanho do ícone (padrão: 80) */
    iconSize?: number;
    /** Texto a ser exibido (padrão: 'GOSTEI!') */
    label?: string;
}

/**
 * Componente SwipeLikeOverlay
 * 
 * Este componente é exibido como um overlay visual sobre um card de oferta
 * quando o usuário realiza um gesto de deslize (swipe) para a direita,
 * indicando uma ação positiva (curtir/gostar).
 * 
 * @component
 */
const SwipeLikeOverlay: React.FC<SwipeLikeOverlayProps> = ({ 
    iconSize = 80, 
    label = OFFER_TRANSLATIONS.OVERLAYS.LIKE
}) => (
    <View 
        style={[styles.container, StyleSheet.absoluteFillObject]} 
        pointerEvents="none"
        accessibilityRole="image"
        accessibilityLabel={OFFER_TRANSLATIONS.OVERLAYS.ACCESSIBILITY_LIKE}
    >
        {/* Ícone de coração centralizado representando a ação de 'Like' */}
        <Icon name="heart" size={iconSize} color={colors.success} />
        
        {/* Texto de feedback visual em destaque */}
        <Text variant="headlineLarge" style={styles.text}>{label}</Text>
    </View>
);

/**
 * Estilos para o componente SwipeLikeOverlay
 * Define a aparência do container semitransparente e a tipografia do texto.
 */
const styles = StyleSheet.create({
    container: {
        flex: 1,
        // Centraliza o conteúdo horizontal e verticalmente
        justifyContent: 'center',
        alignItems: 'center',
        // Fundo verde com opacidade para permitir ver a oferta por baixo
        backgroundColor: 'rgba(76, 175, 80, 0.3)',
        // Aplica o raio de borda definido no tema global
        borderRadius: radius.lg,
    },
    text: {
        // Cor de sucesso definida no tema (geralmente verde)
        color: colors.success,
        fontWeight: 'bold',
        marginTop: 8,
    },
});

export default memo(SwipeLikeOverlay);
