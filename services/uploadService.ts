import { AUTH_TOKEN_STORAGE_KEY } from '../constants';

const API_BASE_URL = '';

const getAuthHeaders = () => {
  const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export async function uploadDishImage(dataUrl: string): Promise<string | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/uploads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ dataUrl }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data?.imageUrl || null;
  } catch (error) {
    console.error('Error uploading image:', error);
    return null;
  }
}
