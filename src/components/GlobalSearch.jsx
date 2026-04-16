// src/components/GlobalSearch.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, X, Loader2, Users, Building2, FileText, Filter } from 'lucide-react';

const DEBOUNCE_DELAY = 300;

const GlobalSearch = ({ 
  supabase, 
  userCompanyId, 
  onResultSelect, 
  t, 
  showNotification,
  className = "" 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');
  const [results, setResults] = useState({
    applications: [],
    users: [],
    companies: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const searchRef = useRef(null);
  const inputRef = useRef(null);

  // Debounce logic
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTerm(searchTerm);
    }, DEBOUNCE_DELAY);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Search function
  const performSearch = useCallback(async () => {
    if (!debouncedTerm.trim() || debouncedTerm.length < 2) {
      setResults({ applications: [], users: [], companies: [] });
      return;
    }

    setIsLoading(true);
    try {
      const searchPattern = `%${debouncedTerm.trim()}%`;
      
      const [appsResult, usersResult, companiesResult] = await Promise.all([
        // Search applications
        supabase
          .from('applications')
          .select('id, object_name, foreman_name, status, created_at, company_id')
          .eq('company_id', userCompanyId)
          .or(`object_name.ilike.${searchPattern},foreman_name.ilike.${searchPattern}`)
          .limit(5),
        
        // Search users
        supabase
          .from('company_users')
          .select('id, full_name, email, phone, role, is_active')
          .eq('company_id', userCompanyId)
          .or(`full_name.ilike.${searchPattern},email.ilike.${searchPattern},phone.ilike.${searchPattern}`)
          .limit(5),
        
        // Search companies (only for superadmin)
        supabase
          .from('companies')
          .select('id, name, plan_tier, is_blocked')
          .ilike('name', searchPattern)
          .limit(5)
      ]);

      setResults({
        applications: appsResult.data || [],
        users: usersResult.data || [],
        companies: companiesResult.data || []
      });
      setShowResults(true);
    } catch (error) {
      console.error('Global search error:', error);
      showNotification?.(t('searchError'), 'error');
    } finally {
      setIsLoading(false);
    }
  }, [debouncedTerm, supabase, userCompanyId, showNotification, t]);

  useEffect(() => {
    performSearch();
  }, [performSearch]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowResults(false);
        inputRef.current?.blur();
      }
      if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      partial: 'bg-orange-100 text-orange-800',
      received: 'bg-green-100 text-green-800',
      canceled: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const totalResults = results.applications.length + results.users.length + results.companies.length;
  const filteredResults = {
    applications: selectedCategory === 'all' || selectedCategory === 'applications' ? results.applications : [],
    users: selectedCategory === 'all' || selectedCategory === 'users' ? results.users : [],
    companies: selectedCategory === 'all' || selectedCategory === 'companies' ? results.companies : []
  };

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => searchTerm.trim() && totalResults > 0 && setShowResults(true)}
          placeholder={t('globalSearchPlaceholder') || "Поиск (нажмите '/' для фокуса)"}
          className="w-full pl-9 pr-10 py-2 text-sm border border-gray-300 dark:border-gray-600 
                   rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                   focus:ring-2 focus:ring-amber-500 focus:border-transparent"
        />
        {searchTerm && (
          <button
            onClick={() => {
              setSearchTerm('');
              setShowResults(false);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        )}
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
        )}
      </div>

      {/* Results dropdown */}
      {showResults && totalResults > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-2xl 
                      border border-gray-200 dark:border-gray-700 z-50 max-h-96 overflow-y-auto">
          {/* Category filters */}
          <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-2 flex gap-2">
            {['all', 'applications', 'users', 'companies'].map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  selectedCategory === cat
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200'
                }`}
              >
                {t(cat) || cat}
              </button>
            ))}
          </div>

          {/* Applications results */}
          {filteredResults.applications.length > 0 && (
            <div className="p-2">
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 px-2 py-1">
                {t('applications')}
              </div>
              {filteredResults.applications.map(app => (
                <button
                  key={app.id}
                  onClick={() => {
                    onResultSelect?.({ type: 'application', data: app });
                    setShowResults(false);
                    setSearchTerm('');
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-sm">{app.object_name}</span>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(app.status)}`}>
                      {t(app.status) || app.status}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {app.foreman_name} • {new Date(app.created_at).toLocaleDateString()}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Users results */}
          {filteredResults.users.length > 0 && (
            <div className="p-2 border-t border-gray-100 dark:border-gray-700">
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 px-2 py-1">
                {t('users')}
              </div>
              {filteredResults.users.map(user => (
                <button
                  key={user.id}
                  onClick={() => {
                    onResultSelect?.({ type: 'user', data: user });
                    setShowResults(false);
                    setSearchTerm('');
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span className="font-medium text-sm">{user.full_name}</span>
                    <span className="text-xs text-gray-500">({user.role})</span>
                    {!user.is_active && (
                      <span className="text-xs text-red-500 ml-auto">{t('blocked')}</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{user.email || user.phone}</div>
                </button>
              ))}
            </div>
          )}

          {/* Companies results */}
          {filteredResults.companies.length > 0 && (
            <div className="p-2 border-t border-gray-100 dark:border-gray-700">
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 px-2 py-1">
                {t('companies')}
              </div>
              {filteredResults.companies.map(company => (
                <button
                  key={company.id}
                  onClick={() => {
                    onResultSelect?.({ type: 'company', data: company });
                    setShowResults(false);
                    setSearchTerm('');
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    <span className="font-medium text-sm">{company.name}</span>
                    {company.is_blocked && (
                      <span className="text-xs text-red-500 ml-auto">{t('blocked')}</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {t('plan')}: {company.plan_tier}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* No results */}
      {showResults && debouncedTerm && totalResults === 0 && !isLoading && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 text-center text-gray-500">
          {t('noResultsFound')}
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;