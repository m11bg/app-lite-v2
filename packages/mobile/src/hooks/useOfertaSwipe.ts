import { useState, useEffect, useCallback, useRef, type RefObject, type Dispatch, type SetStateAction } from 'react';
import { vibrateLight } from '@/utils/haptics';
import { type SwiperCardRefType } from 'rn-swiper-list';
import { Image } from 'expo-image';
import { toAbsoluteMediaUrls } from '@/utils/mediaUrl';
import { OfertaServico, OfertaFilters } from '@/types/oferta';
import { ofertaService } from '@/services/ofertaService';
import { interactionService } from '@/services/interactionService';
import { useAuth } from '@/context/AuthContext';
import { OFFER_TRANSLATIONS } from '@/constants/translations';

// Tamanho de página padrão para as requisições da API
const PAGE_SIZE = 15;
// Quantidade de cartas restantes no deck para disparar o pré-carregamento da próxima página
const PAGINATION_THRESHOLD = 5;

/**
 * Tipo que define o objeto de retorno do hook useOfertaSwipe.
 */
export type UseOfertaSwipeReturn = {
    /** Lista de ofertas carregadas no momento */
    ofertas: OfertaServico[];
    /** Indica se é o carregamento inicial dos dados */
    isInitialLoading: boolean;
    /** Indica se está carregando uma nova página de dados */
    isPaging: boolean;
    /** Indica se uma atualização manual (refresh) está em curso */
    isRefreshing: boolean;
    /** Mensagem de erro amigável ao usuário, se houver */
    error: string | null;
    /** Indica se a lista está vazia, usado para mostrar telas de Empty State */
    isEmpty: boolean;
    /** Indica se há mais páginas a serem carregadas no servidor */
    hasMore: boolean;
    /** Índice da oferta que está no topo do deck */
    currentIndex: number;
    /** Contador incremental para forçar o reinício do componente de Swiper */
    resetCount: number;
    /** Referência para acessar métodos imperativos da biblioteca de Swiper */
    swiperRef: RefObject<SwiperCardRefType | null>;
    /** Callback para processar o swipe para a direita (Interesse) */
    handleSwipeRight: (index: number) => Promise<void>;
    /** Callback para processar o swipe para a esquerda (Desinteresse) */
    handleSwipeLeft: (index: number) => Promise<void>;
    /** Callback para processar o swipe para cima (Pular/Skip) */
    handleSwipeTop: (index: number) => void;
    /** Callback disparado quando todas as cartas do deck atual acabam */
    handleSwipedAll: () => void;
    /** Função para reverter o último swipe e restaurar a carta anterior */
    handleUndo: () => void;
    /** Função para recarregar as ofertas desde a primeira página */
    handleRefresh: () => Promise<void>;
    /** Função para repetir a última requisição que falhou */
    handleRetry: () => void;
    /** Setter para atualizar manualmente o índice da carta atual */
    setCurrentIndex: Dispatch<SetStateAction<number>>;
    /** Setter para definir ou limpar mensagens de erro na UI */
    setError: Dispatch<SetStateAction<string | null>>;
};

/**
 * Hook customizado para gerenciar o estado e a lógica de negócio da funcionalidade de swipe de ofertas.
 * Este hook centraliza o carregamento de dados, controle de paginação, manipulação de interações
 * (like/dislike) e o estado do deck de cartas.
 *
 * @returns {UseOfertaSwipeReturn} Um objeto contendo o estado e as funções de controle do swipe.
 */
export const useOfertaSwipe = (): UseOfertaSwipeReturn => {
    // Estado que armazena a lista de ofertas carregadas
    const [ofertas, setOfertas] = useState<OfertaServico[]>([]);
    // Controle de loading para o estado inicial da tela
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    // Controle de loading para quando o usuário chega ao fim da lista e carrega mais
    const [isPaging, setIsPaging] = useState(false);
    // Controle de loading para a ação de "puxar para atualizar" ou refresh manual
    const [isRefreshing, setIsRefreshing] = useState(false);
    // Armazena mensagens de erro para exibição de feedback ao usuário
    const [error, setError] = useState<string | null>(null);
    // Indica se o servidor ainda possui mais registros para as próximas páginas
    const [hasMore, setHasMore] = useState(true);
    // Indica se a lista está vazia, usado para mostrar telas de Empty State
    const [isEmpty, setIsEmpty] = useState(false);
    // Mantém o rastro de qual carta está sendo visualizada no momento
    const [currentIndex, setCurrentIndex] = useState(0);
    // Contador para forçar o remount do Swiper em resets (refresh ou swipedAll)
    const [resetCount, setResetCount] = useState(0);

    // Referência para acessar métodos imperativos do Swiper (ex: swipeBack)
    const swiperRef = useRef<SwiperCardRefType | null>(null);
    // Referência para rastrear a última página carregada, evitando stale closure na paginação
    const latestPageRef = useRef(1);
    // Referência para o timer de debounce, evitando chamadas repetitivas de paginação
    const paginationDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Contador de requisições para evitar race conditions (ignora respostas de chamadas antigas)
    const requestIdRef = useRef(0);
    // Referência para o AbortController, permitindo cancelar requisições HTTP pendentes
    const abortControllerRef = useRef<AbortController | null>(null);
    // Armazena os parâmetros da última tentativa para facilitar a funcionalidade de "Tentar Novamente"
    const lastRequestRef = useRef<{ page: number; append: boolean; origin: 'initial' | 'paginate' | 'refresh' }>({
        page: 1,
        append: false,
        origin: 'initial',
    });

    // Extrai informações de autenticação do contexto global
    const { isAuthenticated, user, isLoading } = useAuth();

    /**
     * Limpa qualquer agendamento de paginação pendente.
     * Útil para evitar que uma página seja carregada logo após um refresh ou erro.
     */
    const clearPaginationDebounce = useCallback(() => {
        if (paginationDebounceRef.current) {
            clearTimeout(paginationDebounceRef.current);
            paginationDebounceRef.current = null;
        }
    }, []);

    /**
     * Carrega as ofertas da API com suporte a paginação e cancelamento de chamadas concorrentes.
     * Implementa lógica de controle de concorrência usando requestId e AbortController.
     *
     * @param {number} [pageNum=1] - O número da página a ser buscada.
     * @param {boolean} [append=false] - Se verdadeiro, anexa os novos dados à lista existente.
     * @param {'initial' | 'paginate' | 'refresh'} [origin='initial'] - A origem da chamada para definir os estados de loading.
     */
    const loadOfertas = useCallback(
        async (pageNum = 1, append = false, origin: 'initial' | 'paginate' | 'refresh' = 'initial') => {
            // Registra os detalhes da requisição atual para possibilitar retentativas
            lastRequestRef.current = { page: pageNum, append, origin };
            const requestId = ++requestIdRef.current;

            // Cancela a requisição anterior se ainda estiver em andamento
            abortControllerRef.current?.abort();
            const controller = new AbortController();
            abortControllerRef.current = controller;

            // Reseta erros e define o estado de carregamento baseado na origem
            setError(null);
            if (origin === 'initial') setIsInitialLoading(true);
            if (origin === 'paginate') setIsPaging(true);
            if (origin === 'refresh') setIsRefreshing(true);

            try {
                const filters: OfertaFilters = {};
                const currentUserId = user?.id;

                // Em desenvolvimento, podemos ignorar o filtro de interações para facilitar testes
                if (__DEV__) {
                    filters.ignoreInteracted = true;
                }

                // Adiciona o ID do usuário aos filtros se estiver autenticado para ofertas personalizadas
                if (isAuthenticated && typeof currentUserId === 'string' && currentUserId.length > 0) {
                    filters.userId = currentUserId;
                }

                // Chamada ao serviço de ofertas
                const response = await ofertaService.getOfertas(filters, pageNum, PAGE_SIZE, controller.signal);

                // Verifica se esta ainda é a requisição mais recente. Se não for, descarta o resultado.
                if (requestId !== requestIdRef.current) return;

                const newOfertas = response.ofertas || [];
                // Calcula o total de páginas baseado na resposta ou no total de itens
                const totalPages = response.totalPages || Math.max(1, Math.ceil((response.total ?? 0) / PAGE_SIZE));
                const currentPage = response.page || pageNum;
                const noMorePages = currentPage >= totalPages;

                // Atualiza estados baseados no resultado da API
                setHasMore(!noMorePages);
                latestPageRef.current = currentPage;

                // Se append for true, soma à lista atual, senão substitui (usado no refresh/inicial)
                setOfertas((prev) => (append ? [...prev, ...newOfertas] : newOfertas));

                // Se for uma carga completa (não append), resetamos o índice e o contador de remount
                if (!append) {
                    setCurrentIndex(0);
                    setResetCount((prev) => prev + 1);
                }

                // Define se o estado está vazio
                setIsEmpty(!append ? newOfertas.length === 0 : newOfertas.length === 0 && noMorePages);
            } catch (err: unknown) {
                // Se o erro foi um cancelamento intencional, não faz nada
                if (controller.signal.aborted) return;

                const message = err instanceof Error && err.message
                    ? `Erro ao carregar ofertas: ${err.message}`
                    : 'Erro ao carregar ofertas. Verifique sua conexão.';
                setError(message);
            } finally {
                // Limpa os estados de loading apenas se esta ainda for a requisição ativa
                if (requestId === requestIdRef.current) {
                    setIsInitialLoading(false);
                    setIsPaging(false);
                    setIsRefreshing(false);
                }
                // Limpa a referência do controller se ele for o atual
                if (abortControllerRef.current === controller) {
                    abortControllerRef.current = null;
                }
            }
        },
        [isAuthenticated, user]
    );

    /**
     * Agenda o carregamento da próxima página usando um debounce de 300ms.
     * Isso evita disparos múltiplos se o usuário fizer swipes muito rápidos.
     */
    const scheduleNextPage = useCallback(() => {
        // Se já estamos carregando ou não há mais páginas, ignora
        if (!hasMore || isPaging) return;

        clearPaginationDebounce();

        paginationDebounceRef.current = setTimeout(() => {
            // Re-verifica as condições após o timeout
            if (!hasMore || isPaging) return;
            const nextPage = latestPageRef.current + 1;
            void loadOfertas(nextPage, true, 'paginate');
        }, 300);
    }, [clearPaginationDebounce, hasMore, isPaging, loadOfertas]);

    /**
     * Efeito inicial para carregar as ofertas assim que o hook é montado.
     * Também lida com a limpeza de timers e cancelamento de requisições no unmount.
     */
    useEffect(() => {
        // Se a autenticação ainda está carregando, não inicia a busca inicial
        // Isso evita buscas "anônimas" que seriam recarregadas em seguida
        if (isLoading) return;

        void loadOfertas(1, false, 'initial');

        return () => {
            abortControllerRef.current?.abort();
            clearPaginationDebounce();
            requestIdRef.current += 1;
        };
    }, [isLoading, clearPaginationDebounce, loadOfertas]);

    /**
     * Efeito para realizar o pré-carregamento (prefetch) de mídias dos próximos cards.
     * Melhora a fluidez do swipe ao garantir que as imagens já estejam no cache
     * antes mesmo do card ser renderizado ou ficar visível.
     */
    useEffect(() => {
        if (ofertas.length === 0) return;

        const preloadNextItems = () => {
            // Pré-carrega as mídias dos próximos 3 itens a partir do índice atual
            const nextIndex = currentIndex + 1;
            const end = Math.min(nextIndex + 3, ofertas.length);

            for (let i = nextIndex; i < end; i++) {
                const item = ofertas[i];
                if (!item) continue;

                // Converte referências de imagens para URLs absolutas
                const imageUrls = toAbsoluteMediaUrls(item.imagens);
                
                // Dispara o prefetch das imagens via expo-image.
                // Isso garante que as imagens estejam prontas mesmo antes dos cards
                // serem montados pelo Swiper.
                imageUrls.forEach((url) => {
                    // Utiliza void para marcar explicitamente que não estamos aguardando a promise (fire-and-forget),
                    // mas tratamos o erro caso ocorra com .catch() ao invés de try/catch síncrono.
                    void Image.prefetch(url).catch((e) => {
                        if (__DEV__) console.warn('Erro ao fazer prefetch de imagem:', url, e);
                    });
                });
            }
        };

        preloadNextItems();
    }, [currentIndex, ofertas]);

    /**
     * Manipula a ação de swipe para a direita (Like).
     * Registra a interação no servidor e incrementa o índice atual.
     *
     * @param {number} index - O índice da oferta que sofreu o swipe.
     */
    const handleSwipeRight = useCallback(
        async (index: number) => {
            const oferta = ofertas[index];
            if (!oferta) return;

            // Feedback tátil leve
            vibrateLight();

            // Registra a interação de Like no servidor
            if (isAuthenticated) {
                try {
                    await interactionService.likeOffer(oferta._id);
                } catch (err) {
                    if (__DEV__) console.error('Erro ao curtir oferta:', err);
                    
                    // Reverte o estado visual em caso de falha
                    setError('Falha ao registrar interesse. Verifique sua conexão.');
                    swiperRef.current?.swipeBack();
                }
            }

            // Se o usuário estiver chegando perto do fim das ofertas carregadas, busca mais
            if (index >= ofertas.length - PAGINATION_THRESHOLD) {
                scheduleNextPage();
            }
        },
        [isAuthenticated, ofertas, scheduleNextPage, setError]
    );

    /**
     * Manipula a ação de swipe para a esquerda (Dislike).
     * Registra a interação no servidor e incrementa o índice atual.
     *
     * @param {number} index - O índice da oferta que sofreu o swipe.
     */
    const handleSwipeLeft = useCallback(
        async (index: number) => {
            const oferta = ofertas[index];
            if (!oferta) return;

            // Feedback tátil leve
            vibrateLight();

            // Registra a interação de Dislike no servidor
            if (isAuthenticated) {
                try {
                    await interactionService.dislikeOffer(oferta._id);
                } catch (err) {
                    if (__DEV__) console.error('Erro ao descurtir oferta:', err);
                    
                    // Reverte o estado visual em caso de falha
                    setError('Falha ao registrar desinteresse. Verifique sua conexão.');
                    swiperRef.current?.swipeBack();
                }
            }

            // Se o usuário estiver chegando perto do fim das ofertas carregadas, busca mais
            if (index >= ofertas.length - PAGINATION_THRESHOLD) {
                scheduleNextPage();
            }
        },
        [isAuthenticated, ofertas, scheduleNextPage, setError]
    );

    /**
     * Manipula a ação de swipe para cima (Skip/Pular).
     * Apenas avança o índice sem registrar interação no servidor.
     *
     * @param {number} index - O índice da oferta que sofreu o swipe.
     */
    const handleSwipeTop = useCallback(
        (index: number) => {
            // Feedback tátil leve
            vibrateLight();

            // Diferente do Like/Dislike, aqui não chamamos o interactionService.
            // Apenas garantimos que a paginação ocorra se necessário.
            if (index >= ofertas.length - PAGINATION_THRESHOLD) {
                scheduleNextPage();
            }
        },
        [ofertas.length, scheduleNextPage]
    );

    /**
     * Função disparada pelo componente Swiper quando todas as cartas carregadas no deck são removidas.
     * Decide se deve carregar a próxima página ou mostrar o estado de lista vazia.
     */
    const handleSwipedAll = useCallback(() => {
        if (!hasMore) {
            // Se não há mais páginas no servidor, marca como vazio
            setIsEmpty(true);
            return;
        }

        // Quando o usuário consome todas as cartas do deck atual, carregamos a próxima página
        // mantendo o deck atual e acrescentando os novos itens (append = true). 
        // Isso evita que o Swiper permaneça em estado "swiped all" e garante que 
        // a sequência de ofertas seja fluida.
        clearPaginationDebounce();
        const nextPage = latestPageRef.current + 1;
        void loadOfertas(nextPage, true, 'paginate');
    }, [hasMore, clearPaginationDebounce, loadOfertas]);

    /**
     * Permite ao usuário desfazer o último swipe realizado.
     * Utiliza a referência do Swiper para retornar a carta visualmente e decrementa o índice.
     */
    const handleUndo = useCallback(() => {
        const swiper = swiperRef.current;
        if (!swiper || ofertas.length === 0) return;

        try {
            // Invoca swipeBack diretamente sem atrasar em requestAnimationFrame,
            // evitando conflito com o ciclo de gestos do rn-swiper-list no Web.
            swiper.swipeBack();

            vibrateLight();

            // Adia a atualização de estado para uma microtarefa posterior ao frame atual,
            // evitando que o re-render do React interrompa a animação interna da biblioteca.
            queueMicrotask(() => {
                setCurrentIndex(prev => Math.max(0, prev - 1));
            });
        } catch (err) {
            if (__DEV__) console.warn('Aviso ao desfazer swipe:', err);
            // Em caso de erro, garantimos que pelo menos o estado tente sincronizar
            setCurrentIndex(prev => Math.max(0, prev - 1));
        }
    }, [ofertas.length, setCurrentIndex]);
    /**
     * Reinicia o estado do hook e recarrega as ofertas da primeira página.
     * Usado para ações de Pull-to-Refresh.
     *
     * @returns {Promise<void>}
     */
    const handleRefresh = useCallback(async () => {
        setHasMore(true);
        setIsEmpty(false);
        setCurrentIndex(0);
        clearPaginationDebounce();
        await loadOfertas(1, false, 'refresh');
    }, [clearPaginationDebounce, loadOfertas]);

    /**
     * Tenta executar novamente a última requisição que falhou,
     * preservando os parâmetros de página e modo de anexação.
     */
    const handleRetry = useCallback(() => {
        const { page: lastPage, append, origin } = lastRequestRef.current;
        void loadOfertas(lastPage, append, origin);
    }, [loadOfertas]);

    return {
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
        hasMore,
        setCurrentIndex,
        setError,
    };
};
