const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus, NoSubscriberBehavior } = require('@discordjs/voice');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class MusicSystem {
    constructor() {
        this.queues = new Map();
    }

    getQueue(guildId) {
        return this.queues.get(guildId);
    }

    async ensureQueue(guild, voiceChannel, textChannel) {
        let queue = this.queues.get(guild.id);
        if (queue) return queue;

        console.log(`[MUSIC] Joining voice channel: ${voiceChannel.name} in ${guild.name}`);

        const player = createAudioPlayer({
            behaviors: {
                noSubscriber: NoSubscriberBehavior.Pause
            }
        });

        const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator
        });

        const subscription = connection.subscribe(player);
        if (!subscription) {
            console.error('[MUSIC] Failed to subscribe player to connection');
        }
        
        connection.on(VoiceConnectionStatus.Ready, () => {
            console.log('[MUSIC] Voice connection is ready');
        });

        connection.on(VoiceConnectionStatus.Disconnected, () => {
            console.log('[MUSIC] Voice connection disconnected');
        });

        connection.on('error', (error) => {
            console.error('[MUSIC] Voice connection error:', error);
        });
        
        console.log(`[MUSIC] Connected to voice channel successfully`);

        queue = {
            guildId: guild.id,
            voiceChannelId: voiceChannel.id,
            textChannelId: textChannel.id,
            connection,
            player,
            tracks: [],
            current: null
        };

        player.on(AudioPlayerStatus.Playing, () => {
            console.log('[MUSIC] Player status: Playing');
        });

        player.on(AudioPlayerStatus.Idle, () => {
            this.playNext(guild.id).catch(() => {});
        });

        player.on('error', (error) => {
            console.error('[MUSIC] Player error:', error);
            this.playNext(guild.id).catch(() => {});
        });

        this.queues.set(guild.id, queue);
        return queue;
    }

    async getStreamUrl(videoUrl) {
        return new Promise((resolve, reject) => {
            console.log(`[MUSIC] Fetching stream URL from yt-dlp for: ${videoUrl}`);
            
            const ytdlp = spawn('yt-dlp', [
                '-f', 'bestaudio',
                '-g',
                videoUrl
            ]);

            let output = '';
            let error = '';

            ytdlp.stdout.on('data', (data) => {
                output += data.toString();
            });

            ytdlp.stderr.on('data', (data) => {
                error += data.toString();
            });

            ytdlp.on('close', (code) => {
                if (code === 0) {
                    const url = output.trim().split('\n')[0];
                    if (url) {
                        console.log(`[MUSIC] Got stream URL from yt-dlp`);
                        resolve(url);
                    } else {
                        reject(new Error('No URL returned from yt-dlp'));
                    }
                } else {
                    reject(new Error(`yt-dlp error: ${error}`));
                }
            });
        });
    }

    async resolveTrack(query) {
        try {
            const isUrl = /^https?:\/\//i.test(query);
            
            if (isUrl) {
                // Validate it's a YouTube URL
                if (!query.includes('youtube.com') && !query.includes('youtu.be')) {
                    return { error: 'Only YouTube URLs are supported.' };
                }
                
                return { 
                    title: 'Loading...',
                    url: query,
                    type: 'youtube'
                };
            }

            // Search for the query using yt-dlp
            console.log(`[MUSIC] Searching for: ${query}`);
            
            return await new Promise((resolve) => {
                const ytdlp = spawn('yt-dlp', [
                    'ytsearch1:' + query,
                    '--get-id',
                    '--no-warnings'
                ]);

                let videoId = '';
                ytdlp.stdout.on('data', (data) => {
                    videoId += data.toString();
                });

                ytdlp.on('close', () => {
                    if (videoId.trim()) {
                        const url = `https://www.youtube.com/watch?v=${videoId.trim()}`;
                        console.log(`[MUSIC] Search found: ${url}`);
                        resolve({ 
                            title: 'Loading...',
                            url: url,
                            type: 'youtube'
                        });
                    } else {
                        console.error('[MUSIC] No search results for:', query);
                        resolve(null);
                    }
                });
            });
        } catch (error) {
            console.error('[MUSIC] Resolve track error:', error.message);
            return null;
        }
    }

    async enqueue(guild, voiceChannel, textChannel, query, requesterTag) {
        const track = await this.resolveTrack(query);
        if (!track) return { success: false, error: 'No results found.' };
        if (track.error) return { success: false, error: track.error };

        const queue = await this.ensureQueue(guild, voiceChannel, textChannel);
        queue.tracks.push({ ...track, requestedBy: requesterTag });

        if (!queue.current) {
            await this.playNext(guild.id);
        } else {
            console.log(`[MUSIC] Queued: ${track.url}`);
        }

        return { success: true, track };
    }

    async playNext(guildId) {
        const queue = this.queues.get(guildId);
        if (!queue) return;

        let next = queue.tracks.shift();
        
        // Auto-playlist: if queue is empty, search for related songs
        if (!next) {
            if (queue.current) {
                console.log(`[MUSIC] Auto-queuing related songs...`);
                // Search for related content based on last song
                const relatedTrack = await this.resolveTrack(queue.current.url);
                if (relatedTrack && !relatedTrack.error) {
                    queue.tracks.push(relatedTrack);
                    next = queue.tracks.shift();
                } else {
                    console.log(`[MUSIC] Queue empty for guild ${guildId}`);
                    queue.current = null;
                    return;
                }
            } else {
                console.log(`[MUSIC] Queue empty for guild ${guildId}`);
                queue.current = null;
                return;
            }
        }

        try {
            console.log(`[MUSIC] Playing: ${next.url}`);
            
            // Get the stream URL from yt-dlp
            let streamUrl;
            try {
                streamUrl = await this.getStreamUrl(next.url);
            } catch (err) {
                console.error('[MUSIC] Failed to get stream URL:', err.message);
                return this.playNext(guildId);
            }
            
            console.log(`[MUSIC] Stream created for: ${next.url}`);
            
            // Create audio resource from the stream URL
            const resource = createAudioResource(streamUrl, { 
                inlineVolume: true,
                metadata: {
                    title: next.url
                }
            });

            queue.current = next;
            queue.player.play(resource);
            
            console.log(`[MUSIC] Resource playing, player state: ${queue.player.state.status}`);
            console.log(`[MUSIC] Now playing: ${next.url}`);

            return next;
        } catch (error) {
            console.error(`[MUSIC] Playback error:`, error.message || error);
            console.error('[MUSIC] Full error:', error);
            queue.current = null;
            return this.playNext(guildId);
        }
    }

    skip(guildId) {
        const queue = this.queues.get(guildId);
        if (!queue) return false;
        queue.player.stop(true);
        return true;
    }

    stop(guildId) {
        const queue = this.queues.get(guildId);
        if (!queue) return false;
        queue.tracks = [];
        queue.current = null;
        queue.player.stop(true);
        queue.connection.destroy();
        this.queues.delete(guildId);
        return true;
    }

    pause(guildId) {
        const queue = this.queues.get(guildId);
        if (!queue) return false;
        return queue.player.pause();
    }

    resume(guildId) {
        const queue = this.queues.get(guildId);
        if (!queue) return false;
        return queue.player.unpause();
    }

    getQueueSummary(guildId, limit = 10) {
        const queue = this.queues.get(guildId);
        if (!queue) return null;
        return {
            current: queue.current,
            upcoming: queue.tracks.slice(0, limit)
        };
    }
}

module.exports = MusicSystem;
