import mongoose from 'mongoose';
import config from '.';
import logger, { loggerUtils } from '../utils/logger';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Configurar Mongoose
mongoose.set('strictQuery', true);

const attachConnectionEvents = () => {
    const connection = mongoose.connection as any;

    connection.on('connected', async () => {
        logger.info('Conectado ao MongoDB com sucesso');
        loggerUtils.logDatabase('connect', 'mongodb', true);

        // Criação de índices para GridFS (dica de performance)
        try {
            const db: any = (mongoose.connection as any).db;
            const bucketName = process.env.GRIDFS_BUCKET_NAME || 'app_lite_uploads';
            const filesCollection = db.collection(`${bucketName}.files`);

            // Índice para acelerar filtragem por usuário
            await filesCollection.createIndex({ 'metadata.uploadedBy': 1 });
            // Índice para acelerar ordenação por data de upload
            await filesCollection.createIndex({ uploadDate: -1 });

            logger.info(`Índices de GridFS garantidos para ${bucketName}.files`);
        } catch (idxErr) {
            logger.warn('Falha ao criar índices de GridFS (prosseguindo sem travar):', idxErr);
        }
    });

    connection.on('error', (err: any) => {
        logger.error('Erro na conexão com MongoDB:', err);
        loggerUtils.logDatabase('connect', 'mongodb', false, err as any);
    });

    connection.on('disconnected', () => {
        logger.warn('Desconectado do MongoDB');
        loggerUtils.logDatabase('disconnect', 'mongodb', true);
    });

    // Evento de reconexão (quando suportado pelo driver)
    (connection as any).on('reconnected', () => {
        logger.info('Reconectado ao MongoDB');
        loggerUtils.logDatabase('reconnect', 'mongodb', true);
    });
};

const connectDB = async (): Promise<void> => {
    if (config.SKIP_DB) {
        logger.warn('SKIP_DB habilitado: iniciando servidor sem conexão ao MongoDB');
        return;
    }

    const uri = config.MONGO_URI;

    // Helper: decidir se podemos usar banco em memória
    const useMemoryByDefault = !config.IS_PROD && (process.env.USE_IN_MEMORY_DB ?? '').toLowerCase() !== 'false';
    const shouldTryMemory = (process.env.USE_IN_MEMORY_DB ?? '').toLowerCase() === 'true' || useMemoryByDefault;

    // Primeiro: tenta conectar no URI configurado
    try {
        await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 5000,
        } as any);
        attachConnectionEvents();
        return;
    } catch (primaryError) {
        logger.error('Falha ao conectar ao MongoDB (URI configurada):', primaryError as any);
        loggerUtils.logDatabase('connect', 'mongodb', false, primaryError as any);

        // Se permitido, tenta fallback para MongoDB em memória em ambientes não-produtivos
        if (shouldTryMemory) {
            try {
                logger.warn('Tentando fallback para MongoDB em memória (mongodb-memory-server)...');
                const mongod = await MongoMemoryServer.create();
                const memUri = mongod.getUri();
                await mongoose.connect(memUri as any, { serverSelectionTimeoutMS: 5000 } as any);
                // encerra o mongod de memória no shutdown do processo
                process.on('exit', () => void mongod.stop());
                process.on('SIGINT', async () => { await mongod.stop(); process.exit(0); });
                process.on('SIGTERM', async () => { await mongod.stop(); process.exit(0); });

                logger.info('Conectado ao MongoDB em memória com sucesso');
                attachConnectionEvents();
                return;
            } catch (memErr) {
                logger.error('Falha ao iniciar o MongoDB em memória:', memErr as any);
                // Se o fallback também falhar, continuar para lançar o erro abaixo
            }
        }

        // Se chegou aqui, não foi possível conectar nem ao banco real nem ao em memória
        throw primaryError;
    }
};

export const isDbReady = (): boolean => {
    const conn: any = mongoose?.connection as any;
    return !!conn && conn.readyState === 1 && !!conn.db;
};

export const getDatabase = (): any | null => {
    // Retorna a instância atual do banco para uso com GridFSBucket, ou null se indisponível
    return isDbReady() ? (mongoose.connection as any).db : null;
};

export default connectDB;
