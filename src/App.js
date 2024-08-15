import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, push, onValue, remove, update, set, get } from 'firebase/database';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { format } from 'date-fns';

// Configuración de Firebase
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);

// Autenticación anónima
signInAnonymously(auth).catch(error => {
  console.error("Error de autenticación:", error);
});

const useFirebaseAuth = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      setUser(user);
    });

    return () => unsubscribe();
  }, []);

  return user;
};

const WorkLoggerApp = () => {
  const [activeTab, setActiveTab] = useState('newEntry');
  const [entries, setEntries] = useState([]);
  const [categories, setCategories] = useState({ clients: [], family: [] });
  const [newEntry, setNewEntry] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    time: format(new Date(), 'HH:mm'),
    category: 'clients',
    categoryItem: '',
    comments: '',
    articleQuantity: 0
  });
  const [editingEntry, setEditingEntry] = useState(null);
  const [newCategory, setNewCategory] = useState({ type: 'clients', name: '' });
  const [error, setError] = useState(null);

  const user = useFirebaseAuth();

  const fetchData = useCallback(async () => {
    if (!user) return;

    try {
      const entriesRef = ref(database, `users/${user.uid}/entries`);
      const categoriesRef = ref(database, `users/${user.uid}/categories`);

      const entriesSnapshot = await get(entriesRef);
      const categoriesSnapshot = await get(categoriesRef);

      if (entriesSnapshot.exists()) {
        const entriesData = entriesSnapshot.val();
        const entriesArray = Object.entries(entriesData).map(([key, value]) => ({
          id: key,
          ...value
        }));
        setEntries(entriesArray);
      } else {
        setEntries([]);
      }

      if (categoriesSnapshot.exists()) {
        const categoriesData = categoriesSnapshot.val();
        setCategories({
          clients: Array.isArray(categoriesData.clients) ? categoriesData.clients : [],
          family: Array.isArray(categoriesData.family) ? categoriesData.family : []
        });
      } else {
        setCategories({ clients: [], family: [] });
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      setError("Error al cargar los datos. Por favor, intenta de nuevo.");
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, fetchData]);

  const handleAddEntry = useCallback(async (e) => {
    e.preventDefault();
    if (!user) return;

    try {
      const entriesRef = ref(database, `users/${user.uid}/entries`);
      if (editingEntry) {
        const entryRef = ref(database, `users/${user.uid}/entries/${editingEntry.id}`);
        await update(entryRef, newEntry);
        setEditingEntry(null);
      } else {
        await push(entriesRef, newEntry);
      }
      setNewEntry({
        date: format(new Date(), 'yyyy-MM-dd'),
        time: format(new Date(), 'HH:mm'),
        category: 'clients',
        categoryItem: '',
        comments: '',
        articleQuantity: 0
      });
      setActiveTab('history');
      fetchData();
    } catch (error) {
      console.error('Error al añadir/actualizar entrada:', error);
      setError("Error al guardar la entrada. Por favor, intenta de nuevo.");
    }
  }, [user, editingEntry, newEntry, fetchData]);

  const handleDeleteEntry = useCallback(async (id) => {
    if (!user) return;

    try {
      const entryRef = ref(database, `users/${user.uid}/entries/${id}`);
      await remove(entryRef);
      fetchData();
    } catch (error) {
      console.error('Error al eliminar entrada:', error);
      setError("Error al eliminar la entrada. Por favor, intenta de nuevo.");
    }
  }, [user, fetchData]);

  const handleAddCategory = useCallback(async (e) => {
    e.preventDefault();
    if (!user || !newCategory.name || categories[newCategory.type].includes(newCategory.name)) return;

    try {
      const updatedCategories = {
        ...categories,
        [newCategory.type]: [...categories[newCategory.type], newCategory.name]
      };
      const categoriesRef = ref(database, `users/${user.uid}/categories`);
      await set(categoriesRef, updatedCategories);
      setNewCategory({ ...newCategory, name: '' });
      fetchData();
    } catch (error) {
      console.error('Error al añadir categoría:', error);
      setError("Error al añadir la categoría. Por favor, intenta de nuevo.");
    }
  }, [user, categories, newCategory, fetchData]);

  const handleDeleteCategory = useCallback(async (type, name) => {
    if (!user) return;

    try {
      const updatedCategories = {
        ...categories,
        [type]: categories[type].filter(item => item !== name)
      };
      const categoriesRef = ref(database, `users/${user.uid}/categories`);
      await set(categoriesRef, updatedCategories);
      fetchData();
    } catch (error) {
      console.error('Error al eliminar categoría:', error);
      setError("Error al eliminar la categoría. Por favor, intenta de nuevo.");
    }
  }, [user, categories, fetchData]);

  const sortedEntries = useMemo(() => {
    return [...entries].sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [entries]);

  if (error) {
    return (
      <div className="min-h-screen bg-red-100 text-red-900 p-8">
        <h1 className="text-3xl font-bold mb-4">Error</h1>
        <p>{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-4 bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded"
        >
          Recargar página
        </button>
      </div>
    );
  }

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800 p-8">
      <h1 className="text-3xl font-bold mb-8 text-indigo-600">Registro de Trabajo Diario</h1>
      
      <div className="flex space-x-4 mb-8">
        <button onClick={() => setActiveTab('newEntry')} className={`px-4 py-2 rounded ${activeTab === 'newEntry' ? 'bg-indigo-600' : 'bg-indigo-500'} hover:bg-indigo-600 text-white`}>
          {editingEntry ? 'Editar Entrada' : 'Nueva Entrada'}
        </button>
        <button onClick={() => setActiveTab('history')} className={`px-4 py-2 rounded ${activeTab === 'history' ? 'bg-indigo-600' : 'bg-indigo-500'} hover:bg-indigo-600 text-white`}>
          Historial
        </button>
        <button onClick={() => setActiveTab('categories')} className={`px-4 py-2 rounded ${activeTab === 'categories' ? 'bg-indigo-600' : 'bg-indigo-500'} hover:bg-indigo-600 text-white`}>
          Categorías
        </button>
      </div>

      {activeTab === 'newEntry' && (
        <div className="bg-white shadow-lg border-indigo-200 border-2 p-4 rounded">
          <h2 className="text-2xl font-semibold text-indigo-600 mb-4">{editingEntry ? 'Editar Entrada' : 'Nueva Entrada'}</h2>
          <form onSubmit={handleAddEntry} className="space-y-4">
            <div>
              <label className="block mb-1">Fecha:</label>
              <input
                type="date"
                value={newEntry.date}
                onChange={(e) => setNewEntry({...newEntry, date: e.target.value})}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block mb-1">Hora:</label>
              <input
                type="time"
                value={newEntry.time}
                onChange={(e) => setNewEntry({...newEntry, time: e.target.value})}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block mb-1">Categoría:</label>
              <select
                value={newEntry.category}
                onChange={(e) => setNewEntry({...newEntry, category: e.target.value, categoryItem: ''})}
                className="w-full p-2 border rounded"
              >
                <option value="clients">Clientes</option>
                <option value="family">Familia</option>
              </select>
            </div>
            <div>
              <label className="block mb-1">{newEntry.category === 'clients' ? 'Cliente' : 'Familiar'}:</label>
              <select
                value={newEntry.categoryItem}
                onChange={(e) => setNewEntry({...newEntry, categoryItem: e.target.value})}
                className="w-full p-2 border rounded"
              >
                <option value="">Seleccionar</option>
                {categories[newEntry.category].map(item => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block mb-1">Cantidad de Artículos:</label>
              <input
                type="number"
                value={newEntry.articleQuantity}
                onChange={(e) => setNewEntry({...newEntry, articleQuantity: parseInt(e.target.value) || 0})}
                className="w-full p-2 border rounded"
                min="0"
              />
            </div>
            <div>
              <label className="block mb-1">Comentarios:</label>
              <textarea
                value={newEntry.comments}
                onChange={(e) => setNewEntry({...newEntry, comments: e.target.value})}
                className="w-full p-2 border rounded"
                rows="3"
              ></textarea>
            </div>
            <button type="submit" className="w-full bg-indigo-500 hover:bg-indigo-600 text-white py-2 rounded">
              {editingEntry ? 'Actualizar Entrada' : 'Agregar Entrada'}
            </button>
          </form>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white shadow-lg border-indigo-200 border-2 p-4 rounded">
          <h2 className="text-2xl font-semibold text-indigo-600 mb-4">Historials</h2>
          {sortedEntries.map(entry => (
            <div key={entry.id} className="mb-4 p-4 border rounded">
              <p><strong>Fecha:</strong> {entry.date} {entry.time}</p>
              <p><strong>Categoría:</strong> {entry.category === 'clients' ? 'Cliente' : 'Familiar'}</p>
              <p><strong>{entry.category === 'clients' ? 'Cliente' : 'Familiar'}:</strong> {entry.categoryItem}</p>
              <p><strong>Cantidad de Artículos:</strong> {entry.articleQuantity}</p>
              <p><strong>Comentarios:</strong> {entry.comments}</p>
              <div className="mt-2">
                <button onClick={() => {
                  setEditingEntry(entry);
                  setNewEntry(entry);
                  setActiveTab('newEntry');
                }} className="bg-blue-500 hover:bg-blue-600 text-white py-1 px-2 rounded mr-2">
                  Editar
                </button>
                <button onClick={() => handleDeleteEntry(entry.id)} className="bg-red-500 hover:bg-red-600 text-white py-1 px-2 rounded">
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'categories' && (
        <div className="bg-white shadow-lg border-indigo-200 border-2 p-4 rounded">
          <h2 className="text-2xl font-semibold text-indigo-600 mb-4">Categorías</h2>
          <form onSubmit={handleAddCategory} className="mb-4">
            <select
              value={newCategory.type}
              onChange={(e) => setNewCategory({...newCategory, type: e.target.value})}
              className="mr-2 p-2 border rounded"
            >
              <option value="clients">Clientes</option>
              <option value="family">Familia</option>
            </select>
            <input
              type="text"
              value={newCategory.name}
              onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
              placeholder="Nuevo nombre"
              className="mr-2 p-2 border rounded"
            />
            <button type="submit" className="bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded">
              Agregar
            </button>
          </form>
          <div>
            <h3 className="text-xl font-semibold mb-2">Clientes</h3>
            <ul>
              {categories.clients.map(client => (
                <li key={client} className="flex justify-between items-center mb-2">
                  {client}
                  <button onClick={() => handleDeleteCategory('clients', client)} className="bg-red-500 hover:bg-red-600 text-white py-1 px-2 rounded">
                    Eliminar
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-4">
            <h3 className="text-xl font-semibold mb-2">Familia</h3>
            <ul>
              {categories.family.map(family => (
                <li key={family} className="flex justify-between items-center mb-2">
                  {family}
                  <button onClick={() => handleDeleteCategory('family', family)} className="bg-red-500 hover:bg-red-600 text-white py-1 px-2 rounded">
                    Eliminar
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

const App = () => {
  return (
    <ErrorBoundary>
      <WorkLoggerApp />
    </ErrorBoundary>
  );
};

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.log("Error capturado en boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-red-100 text-red-900 p-8">
          <h1 className="text-3xl font-bold mb-4">Algo salió mal</h1>
          <p>Ha ocurrido un error inesperado. Por favor, recarga la página.</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded"
          >
            Recargar página
          </button>
        </div>
      );
    }

    return this.props.children; 
  }
}

export default App;