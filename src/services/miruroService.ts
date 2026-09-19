import axios from 'axios';

const MIRURO_API_URL = 'https://www.miruro.tv/api';

export interface MiruroAnime {
  id: string;
  title: string;
  image: string;
  type: string;
  status: string;
  episodes: number;
}

export const miruroService = {
  async search(query: string) {
    try {
      // Miruro API usually has a search or query endpoint
      const response = await axios.get(`${MIRURO_API_URL}/anime/search?q=${query}`);
      return response.data;
    } catch (error) {
      console.error('Miruro search error:', error);
      return [];
    }
  },

  async getInfo(id: string) {
    try {
      const response = await axios.get(`${MIRURO_API_URL}/anime/info/${id}`);
      return response.data;
    } catch (error) {
      console.error('Miruro info error:', error);
      return null;
    }
  },

  async getEpisodes(id: string) {
    try {
      const response = await axios.get(`${MIRURO_API_URL}/anime/episodes/${id}`);
      return response.data;
    } catch (error) {
      console.error('Miruro episodes error:', error);
      return [];
    }
  }
};
