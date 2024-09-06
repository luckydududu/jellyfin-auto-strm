import {TitleDiscernResult} from "../title_discern";
import axios from "axios";
import {MediaType, NfoProviderConfig} from "../types";
import {NfoInfo, NfoProvider} from "nfo_provider";

export class TmdbProvider implements NfoProvider {

    config: NfoProviderConfig;

    constructor(config: NfoProviderConfig) {
        this.config = config;
    }

    async fetchNfoInfo(parsedResult: TitleDiscernResult): Promise<NfoInfo | undefined> {
        const {title, year, mediaType} = parsedResult;
        const yearParam = year ? `&year=${year}` : '';
        const url = `https://api.themoviedb.org/3/search/${mediaType === 'tvshow' ? 'tv' : 'movie'}?query=${encodeURIComponent(title || '')}${yearParam}&api_key=${this.config.api_key}`;

        try {
            const response = await axios.get(url);
            const tmdbInfo = response.data.results[0];
            if (tmdbInfo) {
                return this.convertTmdbInfoToNfoInfo(tmdbInfo, mediaType);
            }
            return undefined;
        } catch (error) {
            return undefined;
        }
    }

    getConfig(): NfoProviderConfig {
        return this.config;
    }

    private convertTmdbInfoToNfoInfo(tmdbInfo: any, mediaType: MediaType): NfoInfo {
        const nfoInfo: NfoInfo = {
            title: tmdbInfo.title || tmdbInfo.name || '',
            originaltitle: tmdbInfo.original_title || tmdbInfo.original_name || '',
            year: tmdbInfo.release_date ? tmdbInfo.release_date.slice(0, 4) : (tmdbInfo.first_air_date ? tmdbInfo.first_air_date.slice(0, 4) : ''),
            releasedate: tmdbInfo.release_date || tmdbInfo.first_air_date || '',
            rating: tmdbInfo.vote_average ? tmdbInfo.vote_average.toString() : '',
            plot: tmdbInfo.overview || '',
            tmdbid: tmdbInfo.id ? tmdbInfo.id.toString() : '',
            poster: tmdbInfo.poster_path ? `https://image.tmdb.org/t/p/w500${tmdbInfo.poster_path}` : '',
            mpaa: tmdbInfo.certification || '',
        };

        if (mediaType === 'tvshow') {
            nfoInfo.season = tmdbInfo.season_number ? tmdbInfo.season_number.toString() : '';
            nfoInfo.episode = tmdbInfo.episode_number ? tmdbInfo.episode_number.toString() : '';
            nfoInfo.aired = tmdbInfo.air_date || '';
        }

        if (tmdbInfo.genres && tmdbInfo.genres.length > 0) {
            nfoInfo.genre = tmdbInfo.genres.map((genre: any) => genre.name).join(', ');
        }

        return nfoInfo;
    }
}