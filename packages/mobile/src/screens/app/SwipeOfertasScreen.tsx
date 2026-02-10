import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, useWindowDimensions, Vibration } from 'react-native';
import { Text, Button, Snackbar, IconButton } from 'react-native-paper';
import { Swiper, type SwiperCardRefType } from 'rn-swiper-list';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { OfertasStackParamList } from '@/types';
import { OfertaServico, OfertaFilters } from '@/types/oferta';
import { ofertaService } from '@/services/ofertaService';
import { interactionService } from '@/services/interactionService';
import OfferSwipeCard from '@/components/offers/OfferSwipeCard';
import SwipeLikeOverlay from '@/components/offers/SwipeLikeOverlay';
import SwipeNopeOverlay from '@/components/offers/SwipeNopeOverlay';
import { useAuth } from '@/context/AuthContext';
import { colors, spacing, layout } from '@/styles/theme';

// Tamanho de página padrão e margem para pré-carregar mais ofertas antes do fim do deck
const PAGE_SIZE = 10;
const PAGINATION_THRESHOLD = 3;

/**
 * Tela principal de exibição de ofertas no formato de "swipe" (cartões deslizáveis).
 */
const SwipeOfertasScreen: React.FC = () => {
    // Estados para o gerenciamento das ofertas e fluxo de dados
    const [ofertas, setOfertas] = useState<OfertaServico[]>([]);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [isPaging, setIsPaging] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [isEmpty, setIsEmpty] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);

    const swiperRef = useRef<SwiperCardRefType>(null);
    const paginationDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const requestIdRef = useRef(0);
    const abortControllerRef = useRef<AbortController | null>(null);
    const { isAuthenticated, user } = useAuth();
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
                accessibilityLabel="Mudar para lista"
                accessibilityRole="button"
            />
        ),
        [navigation]
    );

    useEffect(() => {
         navigation.setOptions({ headerRight });
     }, [headerRight, navigation]);


     /**
      * Limpa o debounce da paginação para evitar múltiplas chamadas concorrentes.
      * Garante que apenas um agendamento de nova página permaneça ativo.
      *
      * @returns {void} Não retorna valor; apenas limpa o timeout ativo, se existir.
      */
    const clearPaginationDebounce = useCallback(() => {
        if (paginationDebounceRef.current) {
            clearTimeout(paginationDebounceRef.current);
            paginationDebounceRef.current = null;
        }
    }, []);

    /**
     * Carrega as ofertas da API com suporte a paginação e cancelamento de chamadas concorrentes.
     * Usa AbortController e um requestId incremental para descartar respostas antigas e prevenir race conditions.
     * Define estados específicos de carregamento conforme a origem da chamada (inicial, paginação ou refresh).
     *
     * @param {number} [pageNum=1] Número da página solicitada.
     * @param {boolean} [append=false] Se true, anexa resultados ao fim da lista; se false, substitui a lista.
     * @param {'initial' | 'paginate' | 'refresh'} [origin='initial'] Origem lógica da chamada para marcar os loaders corretos.
     * @returns {Promise<void>} Promessa resolvida ao término do fluxo de carregamento.
     */
    const lastRequestRef = useRef<{ page: number; append: boolean; origin: 'initial' | 'paginate' | 'refresh' }>({
        page: 1,
        append: false,
        origin: 'initial',
    });

    const loadOfertas = useCallback(
        async (pageNum = 1, append = false, origin: 'initial' | 'paginate' | 'refresh' = 'initial') => {
            lastRequestRef.current = { page: pageNum, append, origin };
            const requestId = ++requestIdRef.current;
            abortControllerRef.current?.abort();
            const controller = new AbortController();
            abortControllerRef.current = controller;

            setError(null);
            if (origin === 'initial') setIsInitialLoading(true);
            if (origin === 'paginate') setIsPaging(true);
            if (origin === 'refresh') setIsRefreshing(true);

            try {
                // Prepara os filtros incluindo o userId se autenticado para evitar ofertas repetidas
                const filters: OfertaFilters = {};
                const currentUserId = user?.id;
                if (isAuthenticated && typeof currentUserId === 'string' && currentUserId.length > 0) {
                    filters.userId = currentUserId;
                }

                const response = await ofertaService.getOfertas(filters, pageNum, PAGE_SIZE, controller.signal);
                if (requestId !== requestIdRef.current) return;

                const newOfertas = response.ofertas || [];
                const totalPages = response.totalPages || Math.max(1, Math.ceil((response.total ?? 0) / PAGE_SIZE));
                const currentPage = response.page || pageNum;
                const noMorePages = currentPage >= totalPages;

                setHasMore(!noMorePages);
                setPage(currentPage);
                setOfertas((prev) => (append ? [...prev, ...newOfertas] : newOfertas));
                if (!append) setCurrentIndex(0);
                setIsEmpty(!append ? newOfertas.length === 0 : newOfertas.length === 0 && noMorePages);
            } catch (err: unknown) {
                if (controller.signal.aborted) return;
                const message = err instanceof Error && err.message
                    ? `Erro ao carregar ofertas: ${err.message}`
                    : 'Erro ao carregar ofertas. Verifique sua conexão.';
                setError(message);
            } finally {
                if (requestId === requestIdRef.current) {
                    setIsInitialLoading(false);
                    setIsPaging(false);
                    setIsRefreshing(false);
                }
                if (abortControllerRef.current === controller) {
                    abortControllerRef.current = null;
                }
            }
        },
        [isAuthenticated, user]
    );

    // Efeito para carregar as ofertas iniciais quando o componente é montado
    useEffect(() => {
        void loadOfertas(1, false, 'initial');
        return () => {
            abortControllerRef.current?.abort();
            clearPaginationDebounce();
            requestIdRef.current += 1;
        };
    }, [clearPaginationDebounce, loadOfertas]);

    /**
     * Agenda a próxima página com debounce para evitar múltiplas requisições em swipes rápidos.
     * Só dispara se ainda houver páginas e não houver uma paginação em curso.
     *
     * @returns {void} Não retorna valor; apenas agenda a execução assíncrona.
     */
    const scheduleNextPage = useCallback(() => {
        if (!hasMore || isPaging) return;
        clearPaginationDebounce();
        paginationDebounceRef.current = setTimeout(() => {
            if (!hasMore || isPaging) return;
            const nextPage = page + 1;
            void loadOfertas(nextPage, true, 'paginate');
        }, 300);
    }, [clearPaginationDebounce, hasMore, isPaging, loadOfertas, page]);

    /**
     * Manipula o swipe para a direita (Like), registra a interação e pré-carrega mais cartas ao se aproximar do fim.
     *
     * @param {number} index Índice do cartão deslizado.
     * @returns {void} Não retorna valor; efeitos colaterais incluem chamadas de API e agendamento de paginação.
     */
    const handleSwipeRight = useCallback(
        (index: number) => {
            const oferta = ofertas[index];
            if (!oferta) return;

            // Feedback tátil
            Vibration.vibrate(10);
            setCurrentIndex(index + 1);

            // Se o usuário estiver autenticado, registra o Like; caso contrário, apenas passa o cartão
            if (isAuthenticated) {
                void interactionService.likeOffer(oferta._id).catch((err) => {
                    if (__DEV__) console.error(err);
                });
            }

            // Se o usuário estiver chegando ao fim da lista atual, carrega a próxima página
            if (index >= ofertas.length - PAGINATION_THRESHOLD) {
                scheduleNextPage();
            }
        },
        [isAuthenticated, ofertas, scheduleNextPage]
    );

    /**
     * Manipula o swipe para a esquerda (Dislike), registra a interação e pré-carrega mais cartas ao se aproximar do fim.
     *
     * @param {number} index Índice do cartão deslizado.
     * @returns {void} Não retorna valor; efeitos colaterais incluem chamadas de API e agendamento de paginação.
     */
    const handleSwipeLeft = useCallback(
        (index: number) => {
            const oferta = ofertas[index];
            if (!oferta) return;

            // Feedback tátil
            Vibration.vibrate(10);
            setCurrentIndex(index + 1);

            // Se o usuário estiver autenticado, registra o Dislike; caso contrário, apenas passa o cartão
            if (isAuthenticated) {
                void interactionService.dislikeOffer(oferta._id).catch((err) => {
                    if (__DEV__) console.error(err);
                });
            }

            // Lógica de paginação antecipada (carrega mais antes de acabar todos os cartões)
            if (index >= ofertas.length - PAGINATION_THRESHOLD) {
                scheduleNextPage();
            }
        },
        [isAuthenticated, ofertas, scheduleNextPage]
    );

    /**
     * Acionado ao consumir todas as cartas atuais; tenta paginar se houver mais, senão sinaliza lista vazia.
     *
     * @returns {void} Não retorna valor; ajusta estado de vazio ou agenda nova página.
     */
    const handleSwipedAll = useCallback(() => {
        if (hasMore) {
            scheduleNextPage();
        } else {
            setIsEmpty(true);
        }
    }, [hasMore, scheduleNextPage]);

    /**
     * Desfaz o último swipe, devolvendo o cartão ao topo do deck.
     *
     * @returns {void} Não retorna valor; apenas chama a API do swiper.
     */
    const handleUndo = useCallback(() => {
        const swiper = swiperRef.current;
        if (!swiper || ofertas.length === 0) return;
        try {
            if (currentIndex <= 0) return;
            swiper.swipeBack();
            Vibration.vibrate(10);
            setCurrentIndex((prev) => Math.max(0, prev - 1));
        } catch (err) {
            if (__DEV__) console.error(err);
        }
    }, [ofertas.length, currentIndex]);

    /**
     * Recarrega as ofertas do zero (pull-to-refresh) limpando estados de paginação e vazio.
     *
     * @returns {Promise<void>} Promessa resolvida após finalizar o refresh.
     */
    const handleRefresh = useCallback(async () => {
        setPage(1);
        setHasMore(true);
        setIsEmpty(false);
        setCurrentIndex(0);
        clearPaginationDebounce();
        await loadOfertas(1, false, 'refresh');
    }, [clearPaginationDebounce, loadOfertas]);

    /**
     * Renderiza a carta de oferta mantendo referência estável para evitar re-render no Swiper.
     *
     * @param {OfertaServico} item Oferta a ser exibida na carta.
     * @returns {React.JSX.Element} Componente de carta de oferta.
     */
    const renderCard = useCallback(
        (item: OfertaServico, index: number) => (
            <OfferSwipeCard item={item} isActiveCard={index === currentIndex} />
        ),
        [currentIndex]
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

    // Exibe indicador de carregamento centralizado enquanto busca dados iniciais
    if (isInitialLoading && ofertas.length === 0) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text variant="bodyLarge" style={styles.loadingText}>
                    Carregando ofertas...
                </Text>
            </View>
        );
    }

    // Renderiza uma mensagem informativa e botão de recarregar quando não há ofertas disponíveis
    if (isEmpty) {
        return (
            <View style={styles.centerContainer}>
                <Icon name="cards-outline" size={80} color={colors.onSurfaceVariant} accessibilityLabel="Sem ofertas" />
                <Text variant="headlineSmall" style={styles.emptyTitle}>
                    Sem mais ofertas
                </Text>
                <Text variant="bodyMedium" style={styles.emptyText}>
                    Você já viu todas as ofertas disponíveis no momento.
                </Text>
                <Button
                    mode="contained"
                    onPress={handleRefresh}
                    style={styles.refreshButton}
                    loading={isRefreshing}
                    accessibilityLabel="Atualizar ofertas"
                    accessibilityRole="button"
                >
                    Atualizar
                </Button>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.swiperArea}>
                <Swiper
                    ref={swiperRef}
                    data={ofertas}
                    renderCard={renderCard}
                    OverlayLabelRight={renderLikeOverlay}
                    OverlayLabelLeft={renderNopeOverlay}
                    onSwipeRight={handleSwipeRight}
                    onSwipeLeft={handleSwipeLeft}
                    onSwipedAll={handleSwipedAll}
                    onIndexChange={setCurrentIndex}
                    cardStyle={[styles.cardContainer, { width: cardWidth }]}
                />
            </View>

            {/* Barra inferior de ações flutuando no rodapé */}
            <View style={[styles.actionsContainer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
                {/* Botão para descartar a oferta (Swipe Left) */}
                <IconButton
                    icon="close"
                    size={40}
                    iconColor={colors.error}
                    mode="outlined"
                    onPress={() => {
                        Vibration.vibrate(10);
                        swiperRef.current?.swipeLeft();
                    }}
                    style={styles.actionButton}
                    hitSlop={10}
                    accessibilityLabel="Descartar oferta"
                />

                {/* Botão para desfazer o último movimento */}
                <IconButton
                    icon="undo"
                    size={24}
                    iconColor={colors.onSurfaceVariant}
                    mode="outlined"
                    onPress={handleUndo}
                    disabled={currentIndex === 0}
                    style={[styles.undoButton, currentIndex === 0 && { opacity: 0.5 }]}
                    hitSlop={10}
                    accessibilityLabel="Desfazer último swipe"
                />

                {/* Botão para curtir a oferta (Swipe Right) */}
                <IconButton
                    icon="heart"
                    size={40}
                    iconColor={colors.success}
                    mode="outlined"
                    onPress={() => {
                        Vibration.vibrate(10);
                        swiperRef.current?.swipeRight();
                    }}
                    style={styles.actionButton}
                    hitSlop={10}
                    accessibilityLabel="Curtir oferta"
                />
            </View>

            {isPaging && (
                <View style={styles.pagingIndicator}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text variant="bodySmall" style={styles.loadingText}>
                        Carregando mais ofertas...
                    </Text>
                </View>
            )}

            {/* Snackbar para exibição de erros persistentes com opção de retry */}
            <Snackbar
                visible={!!error}
                onDismiss={() => setError(null)}
                action={{
                    label: 'Tentar novamente',
                    onPress: () => {
                        const { page: lastPage, append, origin } = lastRequestRef.current;
                        void loadOfertas(lastPage, append, origin);
                    },
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
        marginTop: spacing.md,
        color: colors.onSurfaceVariant,
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
        backgroundColor: 'transparent', // Transparente para não bloquear o fundo se o card for longo
    },
    actionButton: {
        backgroundColor: colors.surface,
        elevation: 2,
    },
    undoButton: {
        backgroundColor: colors.surface,
        elevation: 1,
    },
    swiperArea: {
        flex: 1,
        width: '100%',
        justifyContent: 'flex-start',
        alignItems: 'center',
        paddingTop: spacing.lg,
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


