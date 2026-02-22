import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, spacing, radius } from '@/styles/theme';

/**
 * Propriedades para o componente MediaProgressIndicator.
 */
interface MediaProgressIndicatorProps {
    /** O número total de itens de mídia (imagens ou vídeos) a serem representados. */
    count: number;
    /** O índice da mídia que está atualmente em exibição (baseado em zero). */
    currentIndex: number;
    /** 
     * Progresso da mídia atual (de 0 a 1). 
     * Se não fornecido ou for imagem, a barra do item atual ficará totalmente preenchida.
     */
    progress?: number;
}

/**
 * Componente que exibe indicadores de progresso (barras horizontais) para múltiplas mídias.
 * Funciona de forma similar ao sistema de Stories do Instagram, permitindo que o usuário
 * visualize quantas mídias existem e em qual ele se encontra no momento.
 *
 * @param {MediaProgressIndicatorProps} props - Objeto contendo as propriedades do componente.
 * @param {number} props.count - Quantidade total de mídias/barras a serem renderizadas.
 * @param {number} props.currentIndex - Índice da mídia que está ativa no momento.
 * @param {number} [props.progress] - Progresso de reprodução do item atual (0 a 1).
 * @returns {JSX.Element | null} O componente renderizado ou null caso haja apenas uma mídia.
 */
const MediaProgressIndicator: React.FC<MediaProgressIndicatorProps> = ({ count, currentIndex, progress = 1 }) => {
    // Se houver apenas uma mídia (ou nenhuma), não faz sentido exibir barras de progresso.
    // Retornamos null para que nada seja renderizado na tela.
    if (count <= 1) return null;

    return (
        <View style={styles.container}>
            {/* 
              * Criamos um array iterável com base no número total de mídias (count).
              * Mapeamos cada item para renderizar uma View que representa uma barra individual.
              */}
            {Array.from({ length: count }).map((_, index) => {
                const isPrevious = index < currentIndex;
                const isCurrent = index === currentIndex;
                
                // Para itens anteriores, a barra está cheia (1). Para itens futuros, vazia (0).
                // Para o item atual, usamos o progresso fornecido (default 1).
                const fillValue = isPrevious ? 1 : isCurrent ? Math.min(Math.max(progress, 0), 1) : 0;

                return (
                    <View
                        key={`progress-bar-${index}`}
                        style={[
                            styles.bar,
                            {
                                // Fundo da barra (parte vazia)
                                backgroundColor: `${colors.surface}80`,
                                flex: 1,
                                overflow: 'hidden',
                            },
                        ]}
                    >
                        {/* Camada de preenchimento */}
                        <View 
                            style={[
                                styles.fill, 
                                { 
                                    width: `${fillValue * 100}%`,
                                    backgroundColor: colors.primary
                                }
                            ]} 
                        />
                    </View>
                );
            })}
        </View>
    );
};

/**
 * Definição de estilos para o componente MediaProgressIndicator utilizando StyleSheet.
 */
const styles = StyleSheet.create({
    /**
     * Estilo do contêiner que envolve todas as barras de progresso.
     * Posiciona o componente de forma absoluta no topo da imagem/vídeo.
     */
    container: {
        position: 'absolute',
        top: spacing.sm, // Espaçamento pequeno em relação ao topo
        left: spacing.sm, // Espaçamento pequeno em relação à esquerda
        right: spacing.sm, // Espaçamento pequeno em relação à direita
        flexDirection: 'row', // Organiza as barras horizontalmente lado a lado
        gap: 4, // Espaço fixo de 4 pixels entre cada barra
        zIndex: 10, // Garante que as barras fiquem sobrepostas ao conteúdo da mídia
    },
    /**
     * Estilo base para cada uma das barras de progresso (fundo).
     */
    bar: {
        height: 3, // Altura fina para as barras, mantendo discrição
        borderRadius: radius.xs, // Arredondamento dos cantos conforme o padrão do tema
    },
    /**
     * Estilo para a parte preenchida da barra.
     */
    fill: {
        height: '100%',
    },
});

export default MediaProgressIndicator;
