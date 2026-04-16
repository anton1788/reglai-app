import { supabase } from './supabaseClient';

export const photoService = {
  // Получить все фото для заявки
  async getApplicationPhotos(applicationId) {
    const { data, error } = await supabase
      .from('material_photos')
      .select('*')
      .eq('application_id', applicationId)
      .order('taken_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },
  
  // Получить фото для конкретного материала
  async getMaterialPhotos(applicationId, materialIndex) {
    const { data, error } = await supabase
      .from('material_photos')
      .select('*')
      .eq('application_id', applicationId)
      .eq('material_index', materialIndex)
      .order('taken_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },
  
  // Удалить фото
  async deletePhoto(photoId, photoUrl) {
    // Удаляем из Storage
    const filePath = photoUrl.split('/').slice(-4).join('/');
    await supabase.storage.from('material-photos').remove([filePath]);
    
    // Удаляем из БД
    const { error } = await supabase
      .from('material_photos')
      .delete()
      .eq('id', photoId);
    
    if (error) throw error;
  },
  
  // Создать отчет с фото
  async generatePhotoReport(applicationId) {
    const photos = await this.getApplicationPhotos(applicationId);
    const { data: application } = await supabase
      .from('applications')
      .select('*')
      .eq('id', applicationId)
      .single();
    
    // Генерируем HTML отчет
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Фотоотчет - ${application.object_name}</title>
        <style>
          body { font-family: Arial; padding: 20px; }
          .photo-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
          .photo-item { border: 1px solid #ccc; padding: 10px; }
          img { max-width: 100%; height: auto; }
        </style>
      </head>
      <body>
        <h1>Фотоотчет по заявке ${application.object_name}</h1>
        <p>Дата: ${new Date().toLocaleString()}</p>
        <div class="photo-grid">
          ${photos.map(photo => `
            <div class="photo-item">
              <img src="${photo.photo_url}" />
              <p>Материал #${photo.material_index + 1}</p>
              <p>${new Date(photo.taken_at).toLocaleString()}</p>
            </div>
          `).join('')}
        </div>
      </body>
      </html>
    `;
    
    return html;
  }
};