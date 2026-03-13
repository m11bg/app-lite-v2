import { User } from './user';

/**
 * Interface simplificada do Prestador para exibição na pré-visualização.
 * Compatível com a estrutura vinda de OfertaServico.prestador e com a interface User.
 */
export interface PrestadorResumo {
  id: string;
  nome: string;
  avatar?: string;
  avatarBlurhash?: string;
  avaliacao: number;
  verified?: boolean;
  // Outros campos úteis para o Header se necessário
  tipoPessoa?: 'PF' | 'PJ';
  localizacao?: {
    cidade: string;
    estado: string;
  };
  telefone?: string;
}

/**
 * Converte um objeto de prestador vindo de uma Oferta para o formato PrestadorResumo.
 * @param prestador Dados do prestador extraídos da oferta.
 * @param localizacaoOferta Fallback para localização caso o prestador não a tenha.
 */
export const toPrestadorResumo = (prestador: any, localizacaoOferta?: any): PrestadorResumo => {
  return {
    id: prestador.id || prestador._id,
    nome: prestador.nome,
    avatar: prestador.avatar,
    avatarBlurhash: prestador.avatarBlurhash,
    avaliacao: prestador.avaliacao || 0,
    verified: prestador.verified,
    tipoPessoa: prestador.tipoPessoa,
    localizacao: prestador.localizacao || localizacaoOferta,
    // Suporte a diferentes nomes de campo vindos do backend para maior resiliência
    telefone: prestador.telefone || prestador.phone || prestador.celular || prestador.contato,
  };
};

/**
 * Converte um User completo para PrestadorResumo.
 */
export const userToPrestadorResumo = (user: User): PrestadorResumo => {
  return {
    id: user.id,
    nome: user.nome,
    avatar: user.avatar,
    avatarBlurhash: user.avatarBlurhash,
    avaliacao: user.avaliacao || 0,
    verified: (user as any).verified, // User interface doesn't have verified yet, but ProfileHeader uses it
    tipoPessoa: user.tipoPessoa,
    localizacao: user.localizacao,
    telefone: user.telefone,
  };
};
