// src/utils/exportUtils.js
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';

// === Константы ===
const COMPANY_LOGO_TEXT = 'Реглай';

// === Вспомогательные функции ===
// ✅ ЭКСПОРТИРУЕМ escapeHtml для использования в App.jsx
export const escapeHtml = (unsafe) => {
  if (typeof unsafe !== 'string') return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

// === 🆕 НОВАЯ: Экспорт в CSV с поддержкой кириллицы ===
export const exportAnalyticsAsCSV = (data, fileName, columns = null) => {
  if (!data?.length) return;
  
  const headers = columns || Object.keys(data[0]);
  const csvContent = [
    headers.map(h => `"${escapeHtml(String(h))}"`).join(','),
    ...data.map(row => 
      headers.map(h => {
        const val = row[h] ?? '';
        // Экранируем кавычки и переносы строк для корректного CSV
        const escaped = String(val).replace(/"/g, '""').replace(/\n/g, ' ').replace(/\r/g, ' ');
        return `"${escaped}"`;
      }).join(',')
    )
  ].join('\n');
  
  // BOM для корректного отображения кириллицы в Excel
  const blob = new Blob(['\uFEFF' + csvContent], { 
    type: 'text/csv;charset=utf-8' 
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fileName}_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

// === Экспорт данных пользователя в PDF ===
export const exportUserDataAsPDF = async (
  user,
  applications,
  comments,
  templates,
  t,
  language,
  userCompany,
  profileData,
  userRole,
  getRoleLabel,
  showNotification,
  setIsLoading
) => {
  if (!user) return;
  setIsLoading(true);
  
  try {
    const escapedCompanyName = escapeHtml(userCompany);
    const escapedEmail = escapeHtml(user.email);
    const escapedFullName = escapeHtml(profileData.fullName || '—');
    const escapedPhone = escapeHtml(profileData.phone || '—');
    const escapedRole = escapeHtml(getRoleLabel(userRole));
    
    const htmlContent = `
<!DOCTYPE html>
<html lang="${language}">
<head>
<meta charset="UTF-8">
<title>${t('myData')} — ${escapedCompanyName}</title>
<style>
  body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; padding: 20px; background: white; color: #1f2937; }
  .container { max-width: 800px; margin: 0 auto; }
  h1 { color: #1f2937; text-align: center; margin-bottom: 20px; font-size: 24px; }
  h2 { color: #374151; margin-top: 25px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; font-size: 18px; }
  table { width: 100%; border-collapse: collapse; margin: 10px 0; }
  th, td { padding: 10px; text-align: left; border: 1px solid #d1d5db; }
  th { background: linear-gradient(to bottom, #f9fafb, #f3f4f6); font-weight: 600; color: #4b5563; }
  .section { margin-bottom: 25px; background: #f9fafb; padding: 15px; border-radius: 8px; }
  .status-badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 500; }
  .status-pending { background: #fef3c7; color: #d97706; }
  .status-received { background: #dbeafe; color: #1d4ed8; }
  .status-partial { background: #ffedd5; color: #c2410c; }
  .status-canceled { background: #fecaca; color: #dc2626; }
  @media print { body { padding: 0; } .container { box-shadow: none; } }
</style>
</head>
<body>
<div class="container">
  <h1>${t('myData')} — ${escapedCompanyName}</h1>
  <p style="text-align: center; color: #6b7280; margin-bottom: 25px;">
    ${t('exportedAt') || 'Экспорт от'}: ${new Date().toLocaleString(language === 'ru' ? 'ru-RU' : 'en-US')}
  </p>
  
  <div class="section">
    <h2>👤 ${t('profile')}</h2>
    <p><strong>Email:</strong> ${escapedEmail}</p>
    <p><strong>ФИО:</strong> ${escapedFullName}</p>
    <p><strong>Телефон:</strong> ${escapedPhone}</p>
    <p><strong>Роль:</strong> ${escapedRole}</p>
  </div>
  
  <div class="section">
    <h2>📋 ${t('applications')} (${applications.length})</h2>
    ${applications.length > 0 ? `
    <table>
      <thead><tr><th>${t('objectName')}</th><th>${t('status')}</th><th>${t('date')}</th></tr></thead>
      <tbody>
        ${applications.map(app => `
        <tr>
          <td>${escapeHtml(app.object_name)}</td>
          <td><span class="status-badge status-${app.status}">${
            app.status === 'pending' ? t('statusPending') :
            app.status === 'partial' ? t('statusPartial') :
            app.status === 'received' ? t('statusReceived') : t('statusCanceled')
          }</span></td>
          <td>${new Date(app.created_at).toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US')}</td>
        </tr>`).join('')}
      </tbody>
    </table>` : `<p style="color: #6b7280;">${t('noData')}</p>`}
  </div>
  
  <div class="section">
    <h2>💬 ${t('comments')} (${comments?.length || 0})</h2>
    ${comments?.length > 0 ? `
    <table>
      <thead><tr><th>${t('content')}</th><th>${t('date')}</th></tr></thead>
      <tbody>
        ${comments.map(c => `<tr><td>${escapeHtml(c.content)}</td><td>${new Date(c.created_at).toLocaleString(language === 'ru' ? 'ru-RU' : 'en-US')}</td></tr>`).join('')}
      </tbody>
    </table>` : `<p style="color: #6b7280;">${t('noData')}</p>`}
  </div>
  
  <div class="section">
    <h2>📦 ${t('templates')} (${templates?.length || 0})</h2>
    ${templates?.length > 0 ? `
    <table>
      <thead><tr><th>${t('name')}</th><th>${t('materials')}</th></tr></thead>
      <tbody>
        ${templates.map(tpl => `<tr><td>${escapeHtml(tpl.template_name)}</td><td>${tpl.materials?.length || 0} ${t('items')}</td></tr>`).join('')}
      </tbody>
    </table>` : `<p style="color: #6b7280;">${t('noData')}</p>`}
  </div>
</div>
</body>
</html>`;

    const tempContainer = document.createElement('div');
    tempContainer.innerHTML = htmlContent;
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.width = '210mm';
    tempContainer.style.backgroundColor = 'white';
    document.body.appendChild(tempContainer);

    const canvas = await html2canvas(tempContainer, { 
      scale: 2, 
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false
    });
    
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgWidth = 210;
    const pageHeight = 297;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, Math.min(imgHeight, pageHeight));
    pdf.save(`my_data_${new Date().toISOString().split('T')[0]}.pdf`);
    document.body.removeChild(tempContainer);
    
    showNotification('✅ ' + (t('exportData') || 'Данные экспортированы') + ' (PDF)!', 'success');
  } catch (err) {
    console.error('❌ Ошибка PDF:', err);
    showNotification('❌ ' + (t('exportError') || 'Не удалось создать PDF'), 'error');
  } finally {
    setIsLoading(false);
  }
};

// === Экспорт данных пользователя в HTML ===
export const exportUserDataAsHTML = async (
  user,
  applications,
  comments,
  templates,
  t,
  language,
  userCompany,
  profileData,
  userRole,
  getRoleLabel,
  showNotification,
  setIsLoading
) => {
  if (!user) return;
  setIsLoading(true);
  
  try {
    const escapedCompanyName = escapeHtml(userCompany);
    const escapedEmail = escapeHtml(user.email);
    const escapedFullName = escapeHtml(profileData.fullName || '—');
    const escapedPhone = escapeHtml(profileData.phone || '—');
    const escapedRole = escapeHtml(getRoleLabel(userRole));
    
    const htmlContent = `
<!DOCTYPE html>
<html lang="${language}">
<head>
<meta charset="UTF-8">
<title>${t('myData')} — ${escapedCompanyName}</title>
<style>
  body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; padding: 20px; background: #f9fafb; color: #1f2937; }
  .container { max-width: 1000px; margin: 0 auto; }
  h1 { color: #1f2937; text-align: center; margin-bottom: 30px; font-size: 28px; }
  h2 { color: #374151; margin-top: 30px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; font-size: 20px; }
  table { width: 100%; border-collapse: collapse; margin: 15px 0; background: white; border-radius: 8px; overflow: hidden; }
  th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
  th { background: linear-gradient(to bottom, #f9fafb, #f3f4f6); font-weight: 600; color: #4b5563; }
  .section { background: white; padding: 20px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 20px; }
  .status-badge { display: inline-block; padding: 5px 14px; border-radius: 9999px; font-size: 13px; font-weight: 500; }
  .status-pending { background: #fef3c7; color: #d97706; }
  .status-received { background: #dbeafe; color: #1d4ed8; }
  .status-partial { background: #ffedd5; color: #c2410c; }
  .status-canceled { background: #fecaca; color: #dc2626; }
</style>
</head>
<body>
<div class="container">
  <h1>${t('myData')} в системе «${escapedCompanyName}»</h1>
  <p style="text-align: center; color: #6b7280; margin-bottom: 30px;">
    ${t('exportedAt')}: ${new Date().toLocaleString(language === 'ru' ? 'ru-RU' : 'en-US')}
  </p>
  
  <div class="section">
    <h2>👤 ${t('profile')}</h2>
    <p><strong>Email:</strong> ${escapedEmail}</p>
    <p><strong>ФИО:</strong> ${escapedFullName}</p>
    <p><strong>Телефон:</strong> ${escapedPhone}</p>
    <p><strong>Роль:</strong> ${escapedRole}</p>
    <p><strong>Компания:</strong> ${escapedCompanyName || '—'}</p>
  </div>
  
  <div class="section">
    <h2>📋 ${t('applications')} (${applications.length})</h2>
    ${applications.length > 0 ? `
    <table>
      <thead><tr><th>${t('objectName')}</th><th>${t('foremanName')}</th><th>${t('status')}</th><th>${t('createdAt')}</th></tr></thead>
      <tbody>
        ${applications.map(app => `
        <tr>
          <td>${escapeHtml(app.object_name)}</td>
          <td>${escapeHtml(app.foreman_name)}</td>
          <td><span class="status-badge status-${app.status}">${
            app.status === 'pending' ? t('statusPending') :
            app.status === 'partial' ? t('statusPartial') :
            app.status === 'received' ? t('statusReceived') : t('statusCanceled')
          }</span></td>
          <td>${new Date(app.created_at).toLocaleString(language === 'ru' ? 'ru-RU' : 'en-US')}</td>
        </tr>`).join('')}
      </tbody>
    </table>` : `<p style="color: #6b7280;">${t('noData')}</p>`}
  </div>
  
  <div class="section">
    <h2>💬 ${t('comments')} (${comments?.length || 0})</h2>
    ${comments?.length > 0 ? `
    <table>
      <thead><tr><th>${t('content')}</th><th>${t('date')}</th></tr></thead>
      <tbody>
        ${comments.map(c => `<tr><td>${escapeHtml(c.content)}</td><td>${new Date(c.created_at).toLocaleString(language === 'ru' ? 'ru-RU' : 'en-US')}</td></tr>`).join('')}
      </tbody>
    </table>` : `<p style="color: #6b7280;">${t('noData')}</p>`}
  </div>
  
  <div class="section">
    <h2>📦 ${t('templates')} (${templates?.length || 0})</h2>
    ${templates?.length > 0 ? `
    <table>
      <thead><tr><th>${t('name')}</th><th>${t('materials')}</th></tr></thead>
      <tbody>
        ${templates.map(tpl => `<tr><td>${escapeHtml(tpl.template_name)}</td><td>${tpl.materials?.length || 0} ${t('items')}</td></tr>`).join('')}
      </tbody>
    </table>` : `<p style="color: #6b7280;">${t('noData')}</p>`}
  </div>
</div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `my_data_${new Date().toISOString().split('T')[0]}.html`;
    a.click();
    URL.revokeObjectURL(url);
    
    showNotification('✅ ' + (t('exportData') || 'Данные экспортированы') + ' (HTML)!', 'success');
  } finally {
    setIsLoading(false);
  }
};

// === 🔄 ОБНОВЛЁННЫЙ: Экспорт аналитики в PDF с улучшенными стилями ===
export const exportAnalyticsSectionAsPDF = async (
  analyticsDetailType,
  applications,
  allApplications,
  isAdminMode,
  t,
  language,
  userCompany,
  user,
  getStatusText,
  getStatusWithOverdue,
  showNotification,
  setIsExportingSection
) => {
  if (!analyticsDetailType || !user) return;
  setIsExportingSection(prev => ({ ...prev, pdf: true }));
  
  try {
    const apps = isAdminMode ? allApplications : applications;
    let title = '';
    let columns = [];
    let rows = [];

    // Формирование данных для экспорта
    if (analyticsDetailType === 'applications') {
      title = t('totalApplications');
      columns = [
        { key: 'object', label: t('objectName') },
        { key: 'foreman', label: t('foremanName') },
        { key: 'status', label: t('status') },
        { key: 'date', label: language === 'ru' ? 'Дата' : 'Date' }
      ];
      rows = apps.map(app => ({
        object: app.object_name,
        foreman: app.foreman_name,
        status: getStatusText(getStatusWithOverdue(app.status, app.created_at)),
        date: new Date(app.created_at).toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US')
      }));
    } else if (analyticsDetailType === 'objects') {
      title = t('totalObjects');
      columns = [
        { key: 'name', label: t('objectName') },
        { key: 'requests', label: t('totalApplications') },
        { key: 'materials', label: t('totalMaterials') },
        { key: 'received', label: t('receivedMaterials') }
      ];
      const objMap = {};
      apps.forEach(app => {
        const key = app.object_name;
        if (!objMap[key]) objMap[key] = { name: key, requests: 0, materials: 0, received: 0 };
        objMap[key].requests += 1;
        objMap[key].materials += app.materials?.reduce((sum, m) => sum + (m.quantity || 0), 0) || 0;
        objMap[key].received += app.materials?.reduce((sum, m) => sum + (m.received || 0), 0) || 0;
      });
      rows = Object.values(objMap);
    } else if (analyticsDetailType === 'materials') {
      title = t('totalMaterials');
      columns = [
        { key: 'description', label: language === 'ru' ? 'Наименование' : 'Description' },
        { key: 'totalRequested', label: language === 'ru' ? 'Запрошено' : 'Requested' },
        { key: 'totalReceived', label: language === 'ru' ? 'Получено' : 'Received' },
        { key: 'progress', label: t('progress') }
      ];
      const matMap = {};
      apps.forEach(app => {
        app.materials?.forEach(m => {
          const key = m.description;
          if (!matMap[key]) matMap[key] = { description: key, totalRequested: 0, totalReceived: 0 };
          matMap[key].totalRequested += m.quantity || 0;
          matMap[key].totalReceived += m.received || 0;
        });
      });
      rows = Object.values(matMap)
        .sort((a, b) => b.totalRequested - a.totalRequested)
        .map(mat => ({
          ...mat,
          progress: mat.totalRequested > 0 
            ? Math.round((mat.totalReceived / mat.totalRequested) * 100) + '%' 
            : '0%'
        }));
    } else if (analyticsDetailType === 'receivedMaterials') {
      title = t('receivedMaterials');
      columns = [
        { key: 'object', label: t('objectName') },
        { key: 'material', label: language === 'ru' ? 'Материал' : 'Material' },
        { key: 'received', label: language === 'ru' ? 'Получено' : 'Received' },
        { key: 'unit', label: language === 'ru' ? 'Ед.' : 'Unit' }
      ];
      rows = apps.flatMap(app =>
        app.materials
          ?.filter(m => (m.received || 0) > 0)
          .map(m => ({
            object: app.object_name,
            material: m.description,
            received: m.received,
            unit: m.unit
          })) || []
      );
    }

    // === 🎨 УЛУЧШЕННЫЕ СТИЛИ ДЛЯ ТЁМНОЙ ТЕМЫ ===
    const statusColors = {
      'received': 'background: #22c55e; color: white;',
      'partial_received': 'background: #f59e0b; color: white;',
      'pending': 'background: #3b82f6; color: white;',
      'canceled': 'background: #ef4444; color: white;',
      'overdue': 'background: #dc2626; color: white;'
    };

    const tableRows = rows.map(row => {
      return `<tr>${columns.map(col => {
        const value = row[col.key];
        const isStatus = col.key === 'status';
        const isProgress = col.key === 'progress';
        
        if (isStatus) {
          const colorStyle = statusColors[value] || 'background: #e5e7eb; color: #374151;';
          return `<td style="${colorStyle}padding: 8px 12px;border-radius: 9999px;font-weight: 500;text-align: center;">${escapeHtml(String(value))}</td>`;
        }
        if (isProgress && typeof value === 'string' && value.includes('%')) {
          const pct = parseInt(value);
          const barColor = pct === 100 ? '#22c55e' : pct >= 50 ? '#3b82f6' : '#f59e0b';
          return `<td style="padding: 8px 12px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <div style="flex: 1; height: 8px; background: #e5e7eb; border-radius: 4px; overflow: hidden;">
                <div style="width: ${pct}%; height: 100%; background: ${barColor}; border-radius: 4px; transition: width 0.3s ease;"></div>
              </div>
              <span style="font-size: 12px; font-weight: 500; min-width: 35px;">${value}</span>
            </div>
          </td>`;
        }
        return `<td style="padding: 12px 10px;">${escapeHtml(String(value ?? ''))}</td>`;
      }).join('')}</tr>`;
    }).join('');

    const htmlContent = `
<!DOCTYPE html>
<html lang="${language}">
<head>
<meta charset="UTF-8">
<title>${t('analytics')} — ${title} — ${escapeHtml(userCompany)}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
  body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; padding: 20px; background: white; color: #1f2937; margin: 0; }
  .container { max-width: 1200px; margin: 0 auto; }
  h1 { color: #1f2937; text-align: center; margin: 0 0 10px 0; font-size: 24px; font-weight: 700; }
  .subtitle { text-align: center; color: #6b7280; margin-bottom: 25px; font-size: 14px; }
  table { width: 100%; border-collapse: collapse; margin: 15px 0; }
  th { 
    padding: 14px 12px; 
    text-align: left; 
    border-bottom: 2px solid #e5e7eb; 
    font-weight: 600; 
    color: #4b5563;
    background: linear-gradient(to bottom, #f9fafb, #f3f4f6);
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 0.025em;
  }
  td { 
    padding: 12px 10px; 
    border-bottom: 1px solid #e5e7eb; 
    color: #374151;
    font-size: 14px;
  }
  tr:hover td { background: #f9fafb; }
  tr:last-child td { border-bottom: none; }
  @media print {
    body { padding: 0; }
    .container { box-shadow: none; }
    @page { margin: 10mm; }
  }
</style>
</head>
<body>
<div class="container">
  <h1>${t('analytics')} — ${title}</h1>
  <p class="subtitle">${escapeHtml(userCompany)} • ${t('exportedAt') || 'Экспорт от'}: ${new Date().toLocaleString(language === 'ru' ? 'ru-RU' : 'en-US')}</p>
  <table>
    <thead>
      <tr>${columns.map(col => `<th>${escapeHtml(col.label)}</th>`).join('')}</tr>
    </thead>
    <tbody>${tableRows}</tbody>
  </table>
</div>
</body>
</html>`;

    const tempContainer = document.createElement('div');
    tempContainer.innerHTML = htmlContent;
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.width = '800px';
    tempContainer.style.backgroundColor = 'white';
    document.body.appendChild(tempContainer);

    const canvas = await html2canvas(tempContainer, { 
      scale: 2, 
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false
    });
    
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgWidth = 210;
    const pageHeight = 297;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    let heightLeft = imgHeight;
    let position = 0;
    
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
    
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }
    
    const timestamp = new Date().toISOString().split('T')[0];
    pdf.save(`${title.replace(/\s+/g, '_')}_${timestamp}.pdf`);
    document.body.removeChild(tempContainer);
    
    showNotification('✅ ' + (t('exportData') || 'Экспорт завершён') + ' (PDF)!', 'success');
  } catch (err) {
    console.error('❌ Ошибка PDF:', err);
    showNotification('❌ ' + (t('exportError') || 'Не удалось создать PDF'), 'error');
  } finally {
    setIsExportingSection(prev => ({ ...prev, pdf: false }));
  }
};

// === 🔄 ОБНОВЛЁННЫЙ: Экспорт аналитики в XLSX/HTML/CSV ===
export const exportAnalyticsSectionData = async (
  format,
  analyticsDetailType,
  applications,
  allApplications,
  isAdminMode,
  t,
  language,
  userCompany,
  user,
  getStatusText,
  getStatusWithOverdue,
  showNotification,
  setIsExportingSection
) => {
  if (!analyticsDetailType || !user) return;
  setIsExportingSection(prev => ({ ...prev, [format]: true }));
  
  try {
    const apps = isAdminMode ? allApplications : applications;
    let dataToExport = [];
    let fileNameBase = '';

    // Формирование данных
    if (analyticsDetailType === 'applications') {
      fileNameBase = 'Applications';
      dataToExport = apps.map(app => ({
        [t('objectName')]: app.object_name,
        [t('foremanName')]: app.foreman_name,
        [t('status')]: getStatusText(getStatusWithOverdue(app.status, app.created_at)),
        [t('date')]: new Date(app.created_at).toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US')
      }));
    } else if (analyticsDetailType === 'objects') {
      fileNameBase = 'Objects';
      const objMap = {};
      apps.forEach(app => {
        const key = app.object_name;
        if (!objMap[key]) objMap[key] = { name: key, requests: 0, materials: 0, received: 0 };
        objMap[key].requests += 1;
        objMap[key].materials += app.materials?.reduce((sum, m) => sum + (m.quantity || 0), 0) || 0;
        objMap[key].received += app.materials?.reduce((sum, m) => sum + (m.received || 0), 0) || 0;
      });
      dataToExport = Object.values(objMap).map(obj => ({
        [t('objectName')]: obj.name,
        [t('totalApplications')]: obj.requests,
        [t('totalMaterials')]: obj.materials,
        [t('receivedMaterials')]: obj.received
      }));
    } else if (analyticsDetailType === 'materials') {
      fileNameBase = 'Materials';
      const matMap = {};
      apps.forEach(app => {
        app.materials?.forEach(m => {
          const key = m.description;
          if (!matMap[key]) matMap[key] = { description: key, totalRequested: 0, totalReceived: 0 };
          matMap[key].totalRequested += m.quantity || 0;
          matMap[key].totalReceived += m.received || 0;
        });
      });
      dataToExport = Object.values(matMap)
        .sort((a, b) => b.totalRequested - a.totalRequested)
        .map(mat => ({
          [t('materialName')]: mat.description,
          [t('totalRequested')]: mat.totalRequested,
          [t('totalReceived')]: mat.totalReceived,
          [t('progress')]: mat.totalRequested > 0 
            ? Math.round((mat.totalReceived / mat.totalRequested) * 100) + '%' 
            : '0%'
        }));
    } else if (analyticsDetailType === 'receivedMaterials') {
      fileNameBase = 'ReceivedMaterials';
      dataToExport = apps.flatMap(app =>
        app.materials
          ?.filter(m => (m.received || 0) > 0)
          .map(m => ({
            [t('objectName')]: app.object_name,
            [t('materialName')]: m.description,
            [t('received')]: m.received,
            [t('unit')]: m.unit
          })) || []
      );
    }

    const timestamp = new Date().toISOString().split('T')[0];
    const fileName = `${fileNameBase}_${timestamp}`;

    if (format === 'html') {
      const htmlContent = `
<!DOCTYPE html>
<html lang="${language}">
<head>
<meta charset="UTF-8">
<title>${t('analytics')} — ${fileNameBase} — ${escapeHtml(userCompany)}</title>
<style>
  body { font-family: 'Inter', sans-serif; padding: 20px; background: #f9fafb; }
  .container { max-width: 1200px; margin: 0 auto; background: white; padding: 25px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
  h1 { color: #1f2937; text-align: center; margin-bottom: 25px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { padding: 12px; text-align: left; border: 1px solid #e5e7eb; }
  th { background: #f3f4f6; font-weight: 600; }
</style>
</head>
<body>
<div class="container">
  <h1>${t('analytics')} — ${fileNameBase}</h1>
  <p style="text-align: center; color: #6b7280; margin-bottom: 20px;">${userCompany} • ${new Date().toLocaleString(language === 'ru' ? 'ru-RU' : 'en-US')}</p>
  <table>
    <thead><tr>${Object.keys(dataToExport[0] || {}).map(key => `<th>${escapeHtml(key)}</th>`).join('')}</tr></thead>
    <tbody>${dataToExport.map(row => `<tr>${Object.values(row).map(val => `<td>${escapeHtml(String(val))}</td>`).join('')}</tr>`).join('')}</tbody>
  </table>
</div>
</body>
</html>`;
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName}.html`;
      a.click();
      URL.revokeObjectURL(url);
      showNotification('✅ ' + (t('exportData') || 'Экспорт завершён') + ' (HTML)!', 'success');
      
    } else if (format === 'xlsx') {
      const ws = XLSX.utils.json_to_sheet(dataToExport);
      
      // Авто-ширина колонок
      const colWidths = Object.keys(dataToExport[0] || {}).map(key => {
        const maxLen = Math.max(
          key.length,
          ...dataToExport.map(row => String(row[key] ?? '').length)
        );
        return { wch: Math.min(maxLen + 2, 50) };
      });
      ws['!cols'] = colWidths;
      
      // Заголовок с компанией
      const wb = XLSX.utils.book_new();
      const header = [
        [COMPANY_LOGO_TEXT],
        [`${t('analytics')} — ${fileNameBase} — ${userCompany}`],
        [`${t('exportedAt')}: ${new Date().toLocaleString(language === 'ru' ? 'ru-RU' : 'en-US')}`],
        []
      ];
      XLSX.utils.sheet_add_aoa(ws, header, { origin: 'A1' });
      
      XLSX.utils.book_append_sheet(wb, ws, fileNameBase);
      XLSX.writeFile(wb, `${fileName}.xlsx`);
      showNotification('✅ ' + (t('exportData') || 'Экспорт завершён') + ' (Excel)!', 'success');
      
    } else if (format === 'csv') {
      exportAnalyticsAsCSV(dataToExport, fileName);
      showNotification('✅ ' + (t('exportData') || 'Экспорт завершён') + ' (CSV)!', 'success');
    }
  } catch (err) {
    console.error(`❌ Ошибка экспорта ${format}:`, err);
    showNotification('❌ ' + (t('exportError') || 'Ошибка экспорта'), 'error');
  } finally {
    setIsExportingSection(prev => ({ ...prev, [format]: false }));
  }
};

// === Экспорт заявки в HTML ===
export const generateHTMLDocument = (application, t, language, userCompany) => {
  const creationDate = new Date(application.created_at);
  const dateString = creationDate.toLocaleString(language === 'ru' ? 'ru-RU' : 'en-US');
  const statusText = application.status === 'pending' ? t('statusPending') :
    application.status === 'partial' ? t('statusPartial') :
    application.status === 'received' ? t('statusReceived') : t('statusCanceled');
  
  const documentTitle = 'РЕГЛАЙ — СИСТЕМА УПРАВЛЕНИЯ ЗАЯВКАМИ';
  const escapedCompanyName = escapeHtml(userCompany || '');
  const escapedObjectName = escapeHtml(application.object_name);
  const escapedForemanName = escapeHtml(application.foreman_name);
  const escapedForemanPhone = escapeHtml(application.foreman_phone || (language === 'ru' ? 'Не указан' : 'Not specified'));
  
  const materialsHtml = application.materials?.map((material, index) => {
    const escapedDesc = escapeHtml(material.description);
    const materialStatus = material.status === 'received' ? t('statusReceived') :
      material.status === 'partial' ? t('statusPartial') : t('statusPending');
    return `
    <tr>
      <td style="text-align: center; font-weight: 600;">${index + 1}</td>
      <td>${escapedDesc}</td>
      <td style="text-align: center;">${material.quantity}</td>
      <td style="text-align: center;">${material.received || 0}</td>
      <td style="text-align: center;">${escapeHtml(material.unit)}</td>
      <td style="text-align: center;">
        <span class="status-badge status-${material.status || 'pending'}">${escapeHtml(materialStatus)}</span>
      </td>
    </tr>`;
  }).join('') || '';

  return `
<!DOCTYPE html>
<html lang="${language}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${documentTitle} — ${escapedObjectName}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  body { font-family: 'Inter', -apple-system, sans-serif; margin: 0; padding: 20px; background: linear-gradient(135deg, #f5f7fa 0%, #e4edf5 100%); color: #333; line-height: 1.6; }
  .container { max-width: 1000px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.08); overflow: hidden; }
  .header { background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 30px 20px; text-align: center; }
  .header h1 { margin: 0; font-size: 24px; font-weight: 700; text-transform: uppercase; }
  .company-info { background: #f1f5f9; padding: 10px 20px; text-align: center; font-size: 14px; color: #475569; border-bottom: 1px solid #e2e8f0; }
  .info-section { padding: 25px 20px; border-bottom: 2px solid #f1f5f9; background: #f8fafc; }
  .info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
  .info-item { display: flex; flex-direction: column; }
  .info-label { font-weight: 600; color: #475569; font-size: 13px; margin-bottom: 4px; }
  .info-value { font-size: 15px; color: #1e293b; font-weight: 500; }
  .materials-section { padding: 30px 20px; }
  .section-title { font-size: 18px; font-weight: 600; color: #1e293b; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 2px solid #e2e8f0; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 14px; }
  th { background: #f1f5f9; padding: 12px 10px; text-align: left; font-weight: 600; color: #475569; font-size: 13px; border-bottom: 2px solid #cbd5e1; }
  td { padding: 12px 10px; border-bottom: 1px solid #e2e8f0; color: #334155; }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: #f8fafc; }
  .footer { padding: 25px 20px; background: #f8fafc; border-top: 2px solid #f1f5f9; font-size: 13px; color: #64748b; }
  .status-badge { display: inline-block; padding: 5px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; text-transform: uppercase; }
  .status-pending { background: #fef3c7; color: #d97706; }
  .status-received { background: #dbeafe; color: #1d4ed8; }
  .status-partial { background: #ffedd5; color: #c2410c; }
  .status-canceled { background: #fecaca; color: #dc2626; }
  @media print { body { background: white; padding: 0; } .container { box-shadow: none; border-radius: 0; } }
  @media (max-width: 640px) { .header { padding: 20px 15px; } .header h1 { font-size: 18px; } .info-grid { grid-template-columns: 1fr; } table { font-size: 12px; } th, td { padding: 8px 6px; } }
</style>
</head>
<body>
<div class="container">
  <div class="header"><h1>${documentTitle}</h1></div>
  <div class="company-info">${escapedCompanyName}</div>
  <div class="info-section">
    <div class="info-grid">
      <div class="info-item"><span class="info-label">${language === 'ru' ? 'Дата создания' : 'Date'}</span><span class="info-value">${dateString}</span></div>
      <div class="info-item"><span class="info-label">${t('objectName')}</span><span class="info-value">${escapedObjectName}</span></div>
      <div class="info-item"><span class="info-label">${t('foremanName')}</span><span class="info-value">${escapedForemanName}</span></div>
      <div class="info-item"><span class="info-label">${t('foremanPhone')}</span><span class="info-value">${escapedForemanPhone}</span></div>
      <div class="info-item"><span class="info-label">${t('status')}</span><span class="info-value"><span class="status-badge status-${application.status}">${escapeHtml(statusText)}</span></span></div>
    </div>
  </div>
  <div class="materials-section">
    <h2 class="section-title">${t('materials')}</h2>
    <table>
      <thead><tr><th style="width: 50px;">№</th><th>${t('materialName')}</th><th style="width: 70px; text-align: center;">${t('requested')}</th><th style="width: 70px; text-align: center;">${t('received')}</th><th style="width: 80px; text-align: center;">${t('unit')}</th><th style="width: 100px; text-align: center;">${t('status')}</th></tr></thead>
      <tbody>${materialsHtml}</tbody>
    </table>
  </div>
  <div class="footer">
    <p><strong>${t('note')}:</strong> ${t('autoGenerated')}</p>
    <p style="text-align: center; margin-top: 10px; font-size: 12px;">© ${COMPANY_LOGO_TEXT} ${new Date().getFullYear()}</p>
  </div>
</div>
</body>
</html>`;
};

export const downloadHTMLFile = (application, t, language, userCompany) => {
  const htmlContent = generateHTMLDocument(application, t, language, userCompany);
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const fileNameDate = new Date(application.created_at).toISOString().split('T')[0];
  a.href = url;
  a.download = `${t('appTitle')?.replace(/\s+/g, '_') || 'Application'}_${application.object_name.replace(/[^a-zA-Z0-9а-яА-ЯёЁ]/g, '_')}_${fileNameDate}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// === Экспорт заявки в PDF ===
export const downloadPDF = async (application, t, language, userCompany, showNotification, setIsExportingPDF) => {
  setIsExportingPDF(true);
  try {
    const htmlContent = generateHTMLDocument(application, t, language, userCompany);
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.width = '800px';
    tempDiv.style.backgroundColor = '#ffffff';
    document.body.appendChild(tempDiv);

    const canvas = await html2canvas(tempDiv, {
      scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false,
      windowWidth: 800, windowHeight: tempDiv.scrollHeight
    });
    document.body.removeChild(tempDiv);

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = 210;
    const pdfHeight = 297;
    const ratio = Math.min(pdfWidth / (canvas.width * 0.264583), 1);
    const finalImgWidth = canvas.width * 0.264583 * ratio;
    const finalImgHeight = canvas.height * 0.264583 * ratio;

    let heightLeft = finalImgHeight;
    let position = 0;
    pdf.addImage(imgData, 'PNG', 0, position, finalImgWidth, finalImgHeight);
    heightLeft -= pdfHeight;
    while (heightLeft > 0) {
      position = heightLeft - finalImgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, finalImgWidth, finalImgHeight);
      heightLeft -= pdfHeight;
    }

    const fileNameDate = new Date(application.created_at).toISOString().split('T')[0];
    const safeObjectName = application.object_name.replace(/[^a-zA-Z0-9а-яА-ЯёЁ\s]/g, '_').trim();
    pdf.save(`Заявка_${safeObjectName}_${fileNameDate}.pdf`);
    showNotification('✅ ' + (t('exportData') || 'Экспорт завершён') + ' (PDF)!', 'success');
  } catch (error) {
    console.error('❌ Ошибка PDF:', error);
    showNotification('❌ ' + (t('exportError') || 'Не удалось создать PDF'), 'error');
  } finally {
    setIsExportingPDF(false);
  }
};

// === Экспорт заявки в XLSX ===
export const downloadXLSXFile = async (application, t, language, showNotification, setIsExportingXLSX) => {
  setIsExportingXLSX(true);
  try {
    const wb = XLSX.utils.book_new();
    const applicationData = [
      [COMPANY_LOGO_TEXT],
      [t('appTitle') || 'Заявка'],
      [],
      [t('objectName'), application.object_name],
      [t('foremanName'), application.foreman_name],
      [t('foremanPhone'), application.foreman_phone || '—'],
      [language === 'ru' ? 'Дата' : 'Date', new Date(application.created_at).toLocaleDateString('ru-RU')],
      [t('status'), application.status === 'pending' ? t('statusPending') :
        application.status === 'partial' ? t('statusPartial') :
        application.status === 'received' ? t('statusReceived') : t('statusCanceled')]
    ];
    const materialsRows = (application.materials || []).map((m, i) => [
      i + 1, m.description, m.quantity, m.received || 0, m.unit,
      m.status === 'received' ? t('statusReceived') : m.status === 'partial' ? t('statusPartial') : t('statusPending')
    ]);
    const wsData = [...applicationData, [], ['№', t('materialName'), t('requested'), t('received'), t('unit'), t('status')], ...materialsRows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [{ wch: 5 }, { wch: 40 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Заявка');
    const fileNameDate = new Date(application.created_at).toISOString().split('T')[0];
    XLSX.writeFile(wb, `${t('appTitle')?.replace(/\s+/g, '_') || 'Application'}_${application.object_name.replace(/[^a-zA-Z0-9а-яА-Я]/g, '_')}_${fileNameDate}.xlsx`);
    showNotification('✅ ' + (t('exportData') || 'Экспорт завершён') + ' (Excel)!', 'success');
  } finally {
    setIsExportingXLSX(false);
  }
};

// === Экспорт полной аналитики в XLSX ===
export const downloadAnalyticsAsXLSX = async (getObjectAnalytics, t, setIsExportingAnalyticsXLSX) => {
  if (!getObjectAnalytics?.length) return;
  setIsExportingAnalyticsXLSX(true);
  try {
    const ws = XLSX.utils.json_to_sheet(getObjectAnalytics.map(obj => ({
      [t('objectName')]: obj.objectName,
      [t('totalApplications')]: obj.totalApplications,
      [t('inProgress')]: obj.pending || 0,
      [t('partially')]: obj.partial || 0,
      [t('received')]: obj.received || 0,
      [t('canceled')]: obj.canceled || 0,
      [t('foremen')]: obj.foremen,
      [t('totalMaterials')]: obj.totalMaterials,
      [t('receivedMaterials')]: obj.receivedMaterials
    })));
    const colWidths = Object.keys(getObjectAnalytics[0] || {}).map(key => ({ wch: Math.min(key.length + 5, 30) }));
    ws['!cols'] = colWidths;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Analytics');
    XLSX.writeFile(wb, `Analytics_${new Date().toISOString().split('T')[0]}.xlsx`);
  } finally {
    setIsExportingAnalyticsXLSX(false);
  }
};

// === Экспорт полной аналитики в HTML ===
export const downloadAnalyticsAsHTML = async (getObjectAnalytics, statusData, processingTimeData, t, language, userCompany, showNotification, setIsExportingAnalyticsHTML, escapeHtml) => {
  if (!getObjectAnalytics?.length) return;
  setIsExportingAnalyticsHTML(true);
  try {
    const htmlContent = `
<!DOCTYPE html>
<html lang="${language}">
<head>
<meta charset="UTF-8">
<title>${t('analytics')} — ${escapeHtml(userCompany)}</title>
<style>
  body { font-family: 'Inter', sans-serif; padding: 20px; background: #f9fafb; }
  .container { max-width: 1200px; margin: 0 auto; background: white; padding: 25px; border-radius: 12px; }
  h1 { text-align: center; margin-bottom: 25px; }
  table { width: 100%; border-collapse: collapse; margin: 15px 0; }
  th, td { padding: 10px; border: 1px solid #e5e7eb; text-align: left; }
  th { background: #f3f4f6; font-weight: 600; }
  .chart-placeholder { height: 200px; background: #f3f4f6; border-radius: 8px; margin: 15px 0; display: flex; align-items: center; justify-content: center; color: #6b7280; }
</style>
</head>
<body>
<div class="container">
  <h1>${t('analytics')} — ${escapeHtml(userCompany)}</h1>
  <p style="text-align: center; color: #6b7280;">${t('exportedAt')}: ${new Date().toLocaleString(language === 'ru' ? 'ru-RU' : 'en-US')}</p>
  
  ${statusData?.length ? `<div class="chart-placeholder">📊 ${t('statusDistribution')}: ${statusData.map(s => `${s.name}: ${s.value}`).join(', ')}</div>` : ''}
  ${processingTimeData?.length ? `<div class="chart-placeholder">⏱️ ${t('processingTime')}: ${processingTimeData.length} ${t('records')}</div>` : ''}
  
  <table>
    <thead><tr>
      <th>${t('objectName')}</th><th>${t('totalApplications')}</th><th>${t('inProgress')}</th>
      <th>${t('partially')}</th><th>${t('received')}</th><th>${t('canceled')}</th>
      <th>${t('foremen')}</th><th>${t('totalMaterials')}</th><th>${t('receivedMaterials')}</th>
    </tr></thead>
    <tbody>
      ${getObjectAnalytics.map(obj => `
        <tr>
          <td>${escapeHtml(obj.objectName)}</td><td>${obj.totalApplications}</td><td>${obj.pending || 0}</td>
          <td>${obj.partial || 0}</td><td>${obj.received || 0}</td><td>${obj.canceled || 0}</td>
          <td>${escapeHtml(obj.foremen)}</td><td>${obj.totalMaterials}</td><td>${obj.receivedMaterials}</td>
        </tr>`).join('')}
    </tbody>
  </table>
</div>
</body>
</html>`;
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Analytics_${new Date().toISOString().split('T')[0]}.html`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification('✅ ' + (t('exportData') || 'Экспорт завершён') + ' (HTML)!', 'success');
  } finally {
    setIsExportingAnalyticsHTML(false);
  }
};

// === Экспорт полной аналитики в PDF ===
export const downloadAnalyticsAsPDF = async (getObjectAnalytics, statusData, processingTimeData, t, language, userCompany, showNotification, setIsExportingAnalyticsPDF, escapeHtml) => {
  if (!getObjectAnalytics?.length) return;
  setIsExportingAnalyticsPDF(true);
  
  try {
    const analyticsContainer = document.createElement('div');
    analyticsContainer.style.cssText = 'padding: 20px; width: 800px; background: white; font-family: Inter, sans-serif;';
    
    analyticsContainer.innerHTML = `
      <h1 style="text-align: center; margin-bottom: 20px;">${t('analytics')} — ${escapeHtml(userCompany)}</h1>
      <p style="text-align: center; color: #666; margin-bottom: 25px;">${t('exportedAt')}: ${new Date().toLocaleString(language === 'ru' ? 'ru-RU' : 'en-US')}</p>
      
      ${statusData?.length ? `
        <div style="margin-bottom: 25px;">
          <h3 style="margin-bottom: 10px;">${t('statusDistribution')}</h3>
          <div style="display: flex; height: 30px; border-radius: 6px; overflow: hidden;">
            ${statusData.map(item => {
              const pct = Math.round((item.value / statusData.reduce((s, i) => s + i.value, 0)) * 100);
              return `<div style="width: ${pct}%; background: ${item.color}; display: flex; align-items: center; justify-content: center; color: white; font-size: 11px; font-weight: 500;">${pct}%</div>`;
            }).join('')}
          </div>
          <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px;">
            ${statusData.map(item => `<span style="display: flex; align-items: center; gap: 5px; font-size: 12px;"><span style="width: 12px; height: 12px; background: ${item.color}; border-radius: 2px;"></span>${item.name}: ${item.value}</span>`).join('')}
          </div>
        </div>` : ''}
      
      <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
        <thead><tr style="background: #f3f4f6;">
          <th style="padding: 10px; text-align: left; border: 1px solid #d1d5db;">${t('objectName')}</th>
          <th style="padding: 10px; text-align: center; border: 1px solid #d1d5db;">${t('totalApplications')}</th>
          <th style="padding: 10px; text-align: center; border: 1px solid #d1d5db; background: #fef9c3;">${t('inProgress')}</th>
          <th style="padding: 10px; text-align: center; border: 1px solid #d1d5db; background: #ffedd5;">${t('partially')}</th>
          <th style="padding: 10px; text-align: center; border: 1px solid #d1d5db; background: #dbeafe;">${t('received')}</th>
          <th style="padding: 10px; text-align: center; border: 1px solid #d1d5db; background: #fecaca;">${t('canceled')}</th>
          <th style="padding: 10px; text-align: left; border: 1px solid #d1d5db;">${t('foremen')}</th>
          <th style="padding: 10px; text-align: right; border: 1px solid #d1d5db;">${t('totalMaterials')}</th>
        </tr></thead>
        <tbody>
          ${getObjectAnalytics.map(obj => `
            <tr>
              <td style="padding: 10px; border: 1px solid #d1d5db;">${escapeHtml(obj.objectName)}</td>
              <td style="padding: 10px; text-align: center; border: 1px solid #d1d5db;">${obj.totalApplications}</td>
              <td style="padding: 10px; text-align: center; border: 1px solid #d1d5db; background: #fef9c3;">${obj.pending || 0}</td>
              <td style="padding: 10px; text-align: center; border: 1px solid #d1d5db; background: #ffedd5;">${obj.partial || 0}</td>
              <td style="padding: 10px; text-align: center; border: 1px solid #d1d5db; background: #dbeafe;">${obj.received || 0}</td>
              <td style="padding: 10px; text-align: center; border: 1px solid #d1d5db; background: #fecaca;">${obj.canceled || 0}</td>
              <td style="padding: 10px; border: 1px solid #d1d5db;">${escapeHtml(obj.foremen)}</td>
              <td style="padding: 10px; text-align: right; border: 1px solid #d1d5db;">${obj.totalMaterials}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    `;
    
    document.body.appendChild(analyticsContainer);
    
    const canvas = await html2canvas(analyticsContainer, {
      scale: 2, useCORS: false, allowTaint: false, logging: false, backgroundColor: '#ffffff'
    });
    document.body.removeChild(analyticsContainer);
    
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgWidth = 210;
    const pageHeight = 297;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    let heightLeft = imgHeight;
    let position = 0;
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }
    
    pdf.save(`Analytics_${new Date().toISOString().split('T')[0]}.pdf`);
    showNotification('✅ ' + (t('exportData') || 'Экспорт завершён') + ' (PDF)!', 'success');
  } catch (error) {
    console.error('❌ Ошибка PDF аналитики:', error);
    showNotification('❌ ' + (t('exportError') || 'Не удалось создать PDF'), 'error');
  } finally {
    setIsExportingAnalyticsPDF(false);
  }
};

// === Копирование заявки в буфер ===
export const copyApplicationText = (application, t, userCompany, language, showNotification) => {
  const statusText = application.status === 'pending' ? t('statusPending') :
    application.status === 'partial' ? t('statusPartial') :
    application.status === 'received' ? t('statusReceived') : t('statusCanceled');
  
  const message = `
${(t('appTitle') || 'ЗАЯВКА').toUpperCase()}
${userCompany}
${t('objectName')}: ${application.object_name}
${t('foremanName')}: ${application.foreman_name}
${t('foremanPhone')}: ${application.foreman_phone || (language === 'ru' ? 'Не указан' : 'Not specified')}
${t('materials')}:
${(application.materials || []).map((mat, idx) => `${idx + 1}. ${mat.description} — ${mat.quantity} ${mat.unit}`).join('\n')}
${t('status')}: ${statusText}
  `.trim();
  
  navigator.clipboard.writeText(message).then(() => {
    showNotification(t('copySuccess') || '✅ Скопировано!', 'success');
  }).catch(() => {
    showNotification(t('copyError') || '❌ Ошибка копирования', 'error');
    alert(message);
  });
};

// === Отправка заявки ===
export const sendApplication = (application, settings, t, userCompany, language, copyApplicationText, showNotification) => {
  const { sendMethod, emailAddress, telegramChatId, phoneNumber } = settings;
  const subject = `${t('appTitle') || 'Заявка'} — ${application.object_name}`;
  
  const message = `
${(t('appTitle') || 'ЗАЯВКА').toUpperCase()}
${userCompany}
${t('objectName')}: ${application.object_name}
${t('foremanName')}: ${application.foreman_name}
${t('foremanPhone')}: ${application.foreman_phone || (language === 'ru' ? 'Не указан' : 'Not specified')}
${t('materials')}:
${(application.materials || []).map((mat, idx) => `${idx + 1}. ${mat.description} — ${mat.quantity} ${mat.unit}`).join('\n')}
${t('status')}: ${t('statusPending')}
  `.trim();
  
  try {
    if (sendMethod === 'email') {
      window.location.href = `mailto:${emailAddress}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
    } else if (sendMethod === 'telegram') {
      const cleanId = telegramChatId?.startsWith('@') ? telegramChatId.slice(1) : telegramChatId;
      window.open(`https://t.me/${cleanId}`, '_blank');
      copyApplicationText(application, t, userCompany, language, showNotification);
    } else if (sendMethod === 'phone') {
      const cleanPhone = phoneNumber?.replace(/\D/g, '');
      const phoneUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
      if (confirm(`Отправить заявку в WhatsApp на ${phoneNumber}?`)) {
        window.open(phoneUrl, '_blank');
      } else {
        copyApplicationText(application, t, userCompany, language, showNotification);
      }
    }
  } catch (error) {
    console.error('❌ Ошибка отправки:', error);
    copyApplicationText(application, t, userCompany, language, showNotification);
  }
};