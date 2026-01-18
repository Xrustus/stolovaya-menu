import { AUTH_TOKEN_STORAGE_KEY } from '../constants';

const API_BASE_URL = '';

const getAuthHeaders = () => {
  const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export async function generateDishImage(name: string, description: string): Promise<string | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/ai/image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ name, description })
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data?.imageUrl || null;
  } catch (error) {
    console.error('Error generating image:', error);
    return null;
  }
}

export async function improveDescription(name: string, currentDesc: string): Promise<string | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/ai/description`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ name, description: currentDesc })
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data?.description || null;
  } catch (error) {
    console.error('Error improving text:', error);
    return null;
  }
}
