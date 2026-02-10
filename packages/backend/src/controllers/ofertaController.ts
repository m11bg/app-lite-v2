import { Response } from 'express';
import crypto from 'crypto';
import { AuthRequest } from '../middleware/auth';
import ofertaService, { ListFilters } from '../services/ofertaService';
import { logger } from '../utils/logger';
import { OfertaFiltersInput, CreateOfertaInput, UpdateOfertaInput } from '../validation/ofertaValidation';

// --- INÍCIO DA CORREÇÃO 1 ---
// Definimos os valores permitidos para 'sort', espelhando o que o service e o frontend esperam.
type SortOption = 'relevancia' | 'preco_menor' | 'preco_maior' | 'avaliacao' | 'recente' | 'distancia';
const ALLOWED_SORT_OPTIONS: SortOption[] = ['relevancia', 'preco_menor', 'preco_maior', 'avaliacao', 'recente', 'distancia'];
// --- FIM DA CORREÇÃO 1 ---

/**
 * Controller responsável por gerenciar as operações relacionadas às ofertas de serviço.
 * Fornece métodos para listagem, criação, atualização e remoção de ofertas.
 */
export const ofertaController = {
    /**
     * Lista as ofertas de serviço com base em filtros, paginação e ordenação.
     * Suporta busca por texto, filtragem por preço, categoria, localização, etc.
     * Implementa cache via ETag e Cache-Control para otimizar a performance.
     * 
     * @async
     * @param {AuthRequest} req - Requisição Express contendo query params de filtro e dados do usuário.
     * @param {Response} res - Resposta Express.
     * @returns {Promise<void>}
     */
    async getOfertas(req: AuthRequest, res: Response) {
        try {
            // 1. Ler a query de entrada. 'q.sort' aqui é (string | undefined)
            const q = (req.query || {}) as unknown as OfertaFiltersInput & { sort?: string };

            // --- INÍCIO DA CORREÇÃO 2 ---
            // 2. Validar e tipar o 'sort'
            let sortValue: SortOption | undefined = undefined;

            if (q.sort) {
                // Verificamos se o valor recebido está na lista de valores permitidos
                if (ALLOWED_SORT_OPTIONS.includes(q.sort as SortOption)) {
                    sortValue = q.sort as SortOption;
                } else {
                    // Se o frontend enviar um valor inválido, logamos e usamos o padrão
                    logger.warn(`Parâmetro 'sort' inválido recebido: "${q.sort}". Usando padrão 'relevancia'.`);
                    sortValue = 'relevancia'; // Fallback
                }
            } else {
                // Se nenhum sort for enviado, usamos o padrão
                sortValue = 'relevancia';
            }

            // 3. Montar o objeto de filtros com o tipo 'ListFilters' correto
            const filters: ListFilters = {
                categoria: q.categoria,
                subcategoria: (q as any).subcategoria,
                precoMin: q.precoMin,
                precoMax: q.precoMax,
                cidade: q.cidade,
                estado: q.estado,
                busca: q.busca,
                page: Number(q.page) || 1,
                limit: Number(q.limit) || 10,
                // 4. Passar o valor validado
                sort: sortValue,

                // Passando os outros filtros que estavam no seu frontend
                comMidia: q.comMidia === true || (q as any).comMidia === 'true',
                tipoPessoa: q.tipoPessoa,
                // Coordenadas opcionais para sort=distancia
                lat: q.lat ? Number(q.lat) : undefined,
                lng: q.lng ? Number(q.lng) : undefined,
                // Prioriza o ID do usuário vindo da autenticação (mais seguro), mas aceita da query
                userId: req.user?.id || (q as any).userId,
            };
            // --- FIM DA CORREÇÃO 2 ---

            // Agora 'filters' tem o tipo exato que 'ofertaService.list' espera
            const result = await ofertaService.list(filters);

            // ETag fraca baseada na query + payload para evitar re-download de dados idênticos
            const etagPayload = JSON.stringify({ q: req.query, result });
            const etag = 'W/"' + crypto.createHash('sha1').update(etagPayload).digest('base64') + '"';

            // Se o cliente enviou If-None-Match com o mesmo ETag, retornar 304 (Not Modified)
            const inm = req.headers['if-none-match'];
            if (inm && inm === etag) {
                res.setHeader('ETag', etag);
                res.status(304).end();
                return;
            }

            // Configura cabeçalhos de cache: Cache privado de 30s com revalidação em background
            res.setHeader('ETag', etag);
            res.setHeader('Cache-Control', 'private, max-age=30, stale-while-revalidate=30');

            res.status(200).json({
                success: true,
                message: 'Ofertas recuperadas com sucesso',
                // O 'result' já vem no formato { ofertas, total, page, totalPages }
                data: result,
            });
        } catch (error: any) {
            logger.error('Erro ao listar ofertas', { message: error?.message, stack: error?.stack });
            res.status(500).json({ success: false, message: 'Erro interno do servidor' });
        }
    },

    /**
     * Obtém os detalhes de uma única oferta pelo seu ID.
     * 
     * @async
     * @param {AuthRequest} req - Requisição Express contendo o ID da oferta nos params.
     * @param {Response} res - Resposta Express.
     * @returns {Promise<void>}
     */
    async getOfertaById(req: AuthRequest, res: Response) {
        try {
            const { id } = req.params as { id: string };
            const oferta = await ofertaService.getById(id);
            if (!oferta) {
                res.status(404).json({ success: false, message: 'Oferta não encontrada' });
                return;
            }
            res.json({ success: true, message: 'Oferta recuperada com sucesso', data: oferta });
        } catch (error: any) {
            logger.error('Erro ao obter oferta', { message: error?.message, stack: error?.stack });
            res.status(500).json({ success: false, message: 'Erro interno do servidor' });
        }
    },

    /**
     * Cria uma nova oferta de serviço.
     * Associa automaticamente a oferta ao usuário autenticado.
     * 
     * @async
     * @param {AuthRequest} req - Requisição Express contendo os dados da nova oferta no body.
     * @param {Response} res - Resposta Express.
     * @returns {Promise<void>}
     */
    async createOferta(req: AuthRequest, res: Response) {
        try {
            const user = req.user;
            if (!user?.id) {
                res.status(401).json({ success: false, message: 'Não autenticado' });
                return;
            }

            const body = req.body as CreateOfertaInput;

            const created = await ofertaService.create(user.id, body as any);
            res.status(201).json({ success: true, message: 'Oferta criada com sucesso', data: created });
        } catch (error: any) {
            const status = typeof error?.status === 'number' ? error.status : 500;
            logger.error('Erro ao criar oferta', { message: error?.message, stack: error?.stack });
            res.status(status).json({ success: false, message: status === 500 ? 'Erro interno do servidor' : error.message });
        }
    },

    /**
     * Atualiza os dados de uma oferta existente.
     * Verifica se a oferta pertence ao usuário ou se ele tem permissão para editar.
     * 
     * @async
     * @param {AuthRequest} req - Requisição Express contendo o ID nos params e os novos dados no body.
     * @param {Response} res - Resposta Express.
     * @returns {Promise<void>}
     */
    async updateOferta(req: AuthRequest, res: Response) {
        try {
            const user = req.user;
            if (!user?.id) {
                res.status(401).json({ success: false, message: 'Não autenticado' });
                return;
            }
            const { id } = req.params as { id: string };
            const body = req.body as UpdateOfertaInput;

            const updated = await ofertaService.update(user.id, id, body as any);
            if (!updated) {
                res.status(404).json({ success: false, message: 'Oferta não encontrada' });
                return;
            }
            res.json({ success: true, message: 'Oferta atualizada com sucesso', data: updated });
        } catch (error: any) {
            const status = typeof error?.status === 'number' ? error.status : 500;
            logger.error('Erro ao atualizar oferta', { message: error?.message, stack: error?.stack });
            res.status(status).json({ success: false, message: status === 500 ? 'Erro interno do servidor' : error.message });
        }
    },

    /**
     * Remove uma oferta de serviço.
     * Exige que a oferta pertença ao usuário autenticado.
     * 
     * @async
     * @param {AuthRequest} req - Requisição Express contendo o ID da oferta nos params.
     * @param {Response} res - Resposta Express.
     * @returns {Promise<void>}
     */
    async deleteOferta(req: AuthRequest, res: Response) {
        try {
            const user = req.user;
            if (!user?.id) {
                res.status(401).json({ success: false, message: 'Não autenticado' });
                return;
            }
            const { id } = req.params as { id: string };

            const removed = await ofertaService.remove(user.id, id);
            if (!removed) {
                res.status(404).json({ success: false, message: 'Oferta não encontrada' });
                return;
            }
            res.json({ success: true, message: 'Oferta removida com sucesso' });
        } catch (error: any) {
            const status = typeof error?.status === 'number' ? error.status : 500;
            logger.error('Erro ao remover oferta', { message: error?.message, stack: error?.stack });
            res.status(status).json({ success: false, message: status === 500 ? 'Erro interno do servidor' : error.message });
        }
    },

    /**
     * Lista todas as ofertas criadas pelo usuário autenticado.
     * 
     * @async
     * @param {AuthRequest} req - Requisição Express contendo os dados do usuário.
     * @param {Response} res - Resposta Express.
     * @returns {Promise<void>}
     */
    async getMinhasOfertas(req: AuthRequest, res: Response) {
        try {
            const user = req.user;
            if (!user?.id) {
                res.status(401).json({ success: false, message: 'Não autenticado' });
                return;
            }

            const ofertas = await ofertaService.listByUser(user.id);
            res.json({ success: true, message: 'Ofertas recuperadas com sucesso', data: { ofertas } });
        } catch (error: any) {
            logger.error('Erro ao listar ofertas do usuário', { message: error?.message, stack: error?.stack });
            res.status(500).json({ success: false, message: 'Erro interno do servidor' });
        }
    },
};

export default ofertaController;