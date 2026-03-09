import React, { useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, Platform, Pressable, Animated, LayoutChangeEvent, GestureResponderEvent } from 'react-native';
import { Image } from 'expo-image';
import { VideoView, useVideoPlayer } from 'expo-video';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { SkeletonBox } from '@/components/profile/skeletons/SkeletonPrimitives';
import MediaProgressIndicator from './MediaProgressIndicator';
import { colors, spacing, radius } from '@/styles/theme';

const FALLBACK_IMAGE = 'https://via.placeholder.com/800x600?text=Oferta';
const PLACEHOLDER_BLURHASH = 'L5H2EC=PM+yV0g-mq.wG9c010J}I';

export type MediaItem = { type: 'image' | 'video'; url: string };

interface OfferMediaProps {
    allMedia: MediaItem[];
    currentMediaIndex: number;
    setCurrentMediaIndex: React.Dispatch<React.SetStateAction<number>>;
    isActive: boolean;
    isMuted: boolean;
    onToggleMute: () => void;
    mediaLoaded: boolean;
    setMediaLoaded: (loaded: boolean) => void;
    videoProgress: number;
    setVideoProgress: (progress: number) => void;
    videoErrored: boolean;
    setVideoErrored: (errored: boolean) => void;
    imageErrored: boolean;
    setImageErrored: (errored: boolean) => void;
    effectiveMediaWidth: number;
    onMediaLayout: (e: LayoutChangeEvent) => void;
    triggerFlash: (anim: Animated.Value) => void;
    leftFlashAnim: Animated.Value;
    rightFlashAnim: Animated.Value;
    centerFlashAnim: Animated.Value;
    accessibilityImageLabel: string;
    strings: any;
}

export const OfferMedia: React.FC<OfferMediaProps> = ({
    allMedia,
    currentMediaIndex,
    setCurrentMediaIndex,
    isActive,
    isMuted,
    onToggleMute,
    mediaLoaded,
    setMediaLoaded,
    videoProgress,
    setVideoProgress,
    videoErrored,
    setVideoErrored,
    imageErrored,
    setImageErrored,
    effectiveMediaWidth,
    onMediaLayout,
    triggerFlash,
    leftFlashAnim,
    rightFlashAnim,
    centerFlashAnim,
    accessibilityImageLabel,
    strings,
}) => {
    const autoAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const videoAutoAdvancedRef = useRef(false);

    const currentMedia = allMedia[currentMediaIndex];

    const handleVideoError = useCallback((err: any) => {
        if (__DEV__) console.warn('Erro ao carregar ou reproduzir vídeo:', err);
        setVideoErrored(true);
        setMediaLoaded(true);
    }, [setVideoErrored, setMediaLoaded]);

    const handleMutePress = useCallback((event: GestureResponderEvent) => {
        if (typeof event.stopPropagation === 'function') {
            event.stopPropagation();
        }
        onToggleMute();
        triggerFlash(centerFlashAnim);
    }, [onToggleMute, triggerFlash, centerFlashAnim]);

    const handleMediaPress = useCallback((event: GestureResponderEvent) => {
        const x = event.nativeEvent?.locationX ?? 0;
        const width = effectiveMediaWidth;

        if (!Number.isFinite(width) || width <= 1) return;

        const left = width / 3;
        const right = (2 * width) / 3;

        if (x < left) {
            if (currentMediaIndex > 0) {
                setCurrentMediaIndex((prev) => Math.max(0, prev - 1));
                triggerFlash(leftFlashAnim);
            }
            return;
        }

        if (x > right) {
            if (currentMediaIndex < allMedia.length - 1) {
                setCurrentMediaIndex((prev) => Math.min(allMedia.length - 1, prev + 1));
                triggerFlash(rightFlashAnim);
            }
            return;
        }

        onToggleMute();
        triggerFlash(centerFlashAnim);
    }, [effectiveMediaWidth, currentMediaIndex, allMedia.length, triggerFlash, leftFlashAnim, rightFlashAnim, onToggleMute, centerFlashAnim, setCurrentMediaIndex]);

    // Auto-advance logic for images
    useEffect(() => {
        if (!isActive) return;
        const media = currentMedia;
        if (!media || media.type !== 'image') return;
        if (!mediaLoaded) return;

        if (autoAdvanceTimerRef.current) {
            clearTimeout(autoAdvanceTimerRef.current);
        }
        autoAdvanceTimerRef.current = setTimeout(() => {
            setCurrentMediaIndex((prev) => (prev + 1) % Math.max(1, allMedia.length));
        }, 4000);

        return () => {
            if (autoAdvanceTimerRef.current) {
                clearTimeout(autoAdvanceTimerRef.current);
            }
        };
    }, [isActive, currentMediaIndex, currentMedia?.type, mediaLoaded, allMedia.length, setCurrentMediaIndex]);

    // Auto-advance logic for videos
    useEffect(() => {
        if (!isActive) return;
        const media = currentMedia;
        if (!media || media.type !== 'video') return;
        if (videoProgress >= 0.985 && !videoAutoAdvancedRef.current) {
            videoAutoAdvancedRef.current = true;
            setCurrentMediaIndex((prev) => (prev + 1) % Math.max(1, allMedia.length));
        }
    }, [videoProgress, isActive, currentMedia, allMedia.length, setCurrentMediaIndex]);

    useEffect(() => {
        videoAutoAdvancedRef.current = false;
    }, [currentMediaIndex, isActive]);

    return (
        <Pressable
            style={styles.imageContainer}
            onPress={handleMediaPress}
            onLayout={onMediaLayout}
            accessibilityRole="image"
            accessibilityLabel={accessibilityImageLabel}
            accessibilityHint={strings.ACCESSIBILITY.MEDIA_NAV_HINT}
            testID="media-pressable"
        >
            <MediaProgressIndicator 
                count={allMedia.length} 
                currentIndex={currentMediaIndex} 
                progress={currentMedia?.type === 'video' ? videoProgress : 1}
            />

            <Animated.View style={[styles.flashOverlay, styles.leftFlash, { opacity: leftFlashAnim }]} pointerEvents="none">
                <Icon name="chevron-left" size={48} color="rgba(255, 255, 255, 0.8)" />
            </Animated.View>

            <Animated.View style={[styles.flashOverlay, styles.rightFlash, { opacity: rightFlashAnim }]} pointerEvents="none">
                <Icon name="chevron-right" size={48} color="rgba(255, 255, 255, 0.8)" />
            </Animated.View>

            <Animated.View style={[styles.flashOverlay, styles.centerFlash, { opacity: centerFlashAnim }]} pointerEvents="none">
                <Icon name={isMuted ? 'volume-off' : 'volume-high'} size={64} color="rgba(255, 255, 255, 0.9)" />
            </Animated.View>

            {currentMedia ? (
                currentMedia.type === 'video' ? (
                    <View style={styles.image}>
                        {videoErrored ? (
                            <>
                                <Image source={{ uri: FALLBACK_IMAGE }} placeholder={PLACEHOLDER_BLURHASH} style={styles.image} contentFit="cover" />
                                <View style={styles.errorOverlay}>
                                    <Icon name="video-off" size={40} color="rgba(255, 255, 255, 0.8)" />
                                </View>
                            </>
                        ) : (
                            <>
                                {!mediaLoaded && <SkeletonBox width="100%" height="100%" radius={0} style={StyleSheet.absoluteFill} />}
                                <VideoViewWrapper 
                                    url={currentMedia.url} 
                                    isActive={isActive} 
                                    isMuted={isMuted} 
                                    onReady={() => setMediaLoaded(true)}
                                    onError={handleVideoError}
                                    onProgressUpdate={setVideoProgress}
                                />
                                <View style={[styles.videoIndicator, { opacity: mediaLoaded ? 1 : 0 }]} pointerEvents="none">
                                    <Icon name="play" size={16} color="white" />
                                </View>
                                <Pressable 
                                    style={[styles.muteStatusIndicator, { opacity: mediaLoaded ? 1 : 0 }]} 
                                    onPress={handleMutePress}
                                    accessibilityRole="button"
                                    accessibilityLabel={isMuted ? strings.ACCESSIBILITY.UNMUTE : strings.ACCESSIBILITY.MUTE}
                                >
                                    <Icon name={isMuted ? 'volume-off' : 'volume-high'} size={16} color="white" />
                                </Pressable>
                            </>
                        )}
                    </View>
                ) : (
                    <View style={styles.image}>
                        {!mediaLoaded && <SkeletonBox width="100%" height="100%" radius={0} style={StyleSheet.absoluteFill} />}
                        <Image
                            source={{ uri: imageErrored ? FALLBACK_IMAGE : currentMedia.url }}
                            placeholder={PLACEHOLDER_BLURHASH}
                            style={styles.image}
                            contentFit="cover"
                            transition={300}
                            onLoad={() => setMediaLoaded(true)}
                            onError={() => setImageErrored(true)}
                        />
                    </View>
                )
            ) : (
                <View style={styles.image}>
                    <Image source={{ uri: FALLBACK_IMAGE }} placeholder={PLACEHOLDER_BLURHASH} style={styles.image} contentFit="cover" transition={300} />
                </View>
            )}
        </Pressable>
    );
};

interface VideoViewWrapperProps {
    url: string;
    isActive: boolean;
    isMuted: boolean;
    onReady?: () => void;
    onError?: (error: any) => void;
    onProgressUpdate?: (progress: number) => void;
}

const VideoViewWrapperWeb: React.FC<VideoViewWrapperProps> = ({ url, isActive, isMuted, onReady, onError, onProgressUpdate }) => {
    const videoRef = React.useRef<HTMLVideoElement | null>(null);

    useEffect(() => {
        const el = videoRef.current;
        if (!el) return;
        el.muted = isMuted;
        try { el.volume = isMuted ? 0 : 1; } catch {}
        if (!isMuted && isActive) {
            el.play().catch((err) => { if (__DEV__) console.warn('Falha ao dar play com som (web):', err); });
        }
    }, [isMuted, isActive]);

    useEffect(() => {
        const el = videoRef.current;
        if (!el) return;
        if (isActive) {
            const play = async () => {
                try {
                    await el.play();
                    if (onReady) onReady();
                } catch (err) {
                    if (__DEV__) console.warn('Falha ao dar play (web):', err);
                    if (el.readyState >= 2 && onReady) onReady();
                }
            };
            void play();
        } else {
            el.pause();
            if (onProgressUpdate) onProgressUpdate(0);
        }
    }, [isActive, onProgressUpdate, onReady]);

    return (
        <View style={styles.image}>
            <video
                ref={videoRef}
                src={url}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                autoPlay={isActive}
                muted={isMuted}
                playsInline
                onLoadedData={onReady}
                onLoadedMetadata={onReady}
                onCanPlay={onReady}
                onError={onError}
                onTimeUpdate={(e) => {
                    const target = e.currentTarget;
                    if (onProgressUpdate && target.duration > 0) {
                        onProgressUpdate(target.currentTime / target.duration);
                    }
                }}
            />
        </View>
    );
};

const VideoViewWrapperNative: React.FC<VideoViewWrapperProps> = ({ url, isActive, isMuted, onReady, onError, onProgressUpdate }) => {
    const player = useVideoPlayer(url, (p) => {
        p.loop = false;
        p.muted = isMuted;
    });

    useEffect(() => {
        const timeSub = player.addListener('timeUpdate', (payload) => {
            if (onProgressUpdate && player.duration > 0) {
                onProgressUpdate(payload.currentTime / player.duration);
            }
        });
        const statusSub = player.addListener('statusChange', (payload: any) => {
            if (payload.status === 'error' && onError) {
                onError(payload.error || { message: 'Erro de reprodução de vídeo' });
            }
        });
        return () => {
            timeSub.remove();
            statusSub.remove();
        };
    }, [player, onProgressUpdate, onError]);

    useEffect(() => {
        player.muted = isMuted;
    }, [isMuted, player]);

    useEffect(() => {
        try {
            if (isActive) {
                player.play();
                if (onReady) onReady();
            } else {
                player.pause();
            }
        } catch (err) {
            if (__DEV__) console.warn('Falha ao controlar vídeo (nativo):', err);
        }
    }, [isActive, player, onReady]);

    return <VideoView player={player} style={styles.image} contentFit="cover" />;
};

const VideoViewWrapper: React.FC<VideoViewWrapperProps> = (props) => {
    if (Platform.OS === 'web') return <VideoViewWrapperWeb {...props} />;
    return <VideoViewWrapperNative {...props} />;
};

const styles = StyleSheet.create({
    imageContainer: {
        width: '100%',
        aspectRatio: 16 / 10,
        backgroundColor: colors.backdrop,
    },
    image: {
        width: '100%',
        height: '100%',
    },
    flashOverlay: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: '33.3%',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 15,
    },
    leftFlash: {
        left: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
    },
    rightFlash: {
        right: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
    },
    centerFlash: {
        left: '33.3%',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    muteStatusIndicator: {
        position: 'absolute',
        bottom: spacing.sm,
        right: spacing.sm,
        zIndex: 30,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        borderRadius: radius.full,
        padding: 8,
    },
    videoIndicator: {
        position: 'absolute',
        bottom: spacing.sm,
        left: spacing.sm,
        zIndex: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        borderRadius: radius.full,
        padding: 6,
    },
    errorOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 21,
    },
});
