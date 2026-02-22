/**
 * Centralização de strings de tradução para componentes de Ofertas.
 * Seguindo o padrão de constantes do projeto (messages.ts).
 */
export const OFFER_TRANSLATIONS = {
    CARD: {
        FALLBACKS: {
            TITLE: 'Serviço não informado',
            DESCRIPTION: 'Descrição não informada',
            CITY: 'Cidade não informada',
            PROVIDER: 'Prestador',
            PRICE_UNIT: 'unidade',
            IMAGE_TEXT: 'Oferta',
        },
        ACCESSIBILITY: {
            HINT: 'Abre os detalhes da oferta',
            CATEGORY_PREFIX: 'Categoria',
            TITLE_PREFIX: 'Título',
            DESCRIPTION_PREFIX: 'Descrição',
            PRICE_PREFIX: 'Preço',
            IMAGE_PREFIX: 'Imagem da oferta',
            PROVIDER_PREFIX: 'Prestador',
            MEDIA_NAV_HINT: 'Toque à esquerda/direita para navegar entre as mídias',
        },
    },
    SCREEN: {
        LOADING: 'Buscando as melhores ofertas...',
        EMPTY_TITLE: 'Sem mais ofertas',
        EMPTY_TEXT: 'Você já viu todas as ofertas disponíveis no momento.',
        REFRESH_BUTTON: 'Atualizar',
        PAGING_INDICATOR: 'Carregando mais ofertas...',
        RETRY_LABEL: 'Tentar novamente',
    },
    OVERLAYS: {
        LIKE: 'GOSTEI!',
        NOPE: 'NÃO',
        ACCESSIBILITY_LIKE: 'Indicação de que você gostou da oferta',
        ACCESSIBILITY_NOPE: 'Indicação de que você não gostou da oferta',
    },
    ACTIONS: {
        LIKE: 'Curtir oferta',
        DISLIKE: 'Descartar oferta',
        UNDO: 'Desfazer último swipe',
        SWITCH_TO_LIST: 'Mudar para lista',
    },
} as const;
