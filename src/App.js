import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, push, onValue, remove, update, set } from 'firebase/database';
import { format } from 'date-fns';

console.log("Variables de entorno de Firebase:");
console.log("API_KEY:", process.env.REACT_APP_FIREBASE_API_KEY);
console.log("AUTH_DOMAIN:", process.env.REACT_APP_FIREBASE_AUTH_DOMAIN);
console.log("DATABASE_URL:", process.env.REACT_APP_FIREBASE_DATABASE_URL);
console.log("PROJECT_ID:", process.env.REACT_APP_FIREBASE_PROJECT_ID);
console.log("STORAGE_BUCKET:", process.env.REACT_APP_FIREBASE_STORAGE_BUCKET);
console.log("MESSAGING_SENDER_ID:", process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID);
console.log("APP_ID:", process.env.REACT_APP_FIREBASE_APP_ID);

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

console.log("Firebase Config:", JSON.stringify(firebaseConfig, null, 2));

// Inicializa Firebase
let app;
let database;

try {
  app = initializeApp(firebaseConfig);
  console.log("Firebase inicializado correctamente");
  
  database = getDatabase(app);
  console.log("Base de datos de Firebase obtenida correctamente");
} catch (error) {
  console.error("Error al inicializar Firebase o obtener la base de datos:", error);
}

const getFirebaseDatabase = () => {
  if (!database) {
    console.error("La base de datos de Firebase no está inicializada");
    return null;
  }
  return database;
};

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.log("Error capturado en boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-red-100 text-red-900 p-8">
          <h1 className="text-3xl font-bold mb-4">Algo salió mal</h1>
          <p>{this.state.error && this.state.error.toString()}</p>
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

const WorkLoggerApp = () => {
  console.log("Iniciando renderizado de WorkLoggerApp");

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

  useEffect(() => {
    console.log("useEffect iniciado");
    const db = getFirebaseDatabase();
    if (!db) return;

    const entriesRef = ref(db, 'entries');
    const categoriesRef = ref(db, 'categories');

    const unsubscribeEntries = onValue(entriesRef, (snapshot) => {
      console.log("Recibiendo actualización de entradas");
      const data = snapshot.val();
      if (data) {
        const entriesArray = Object.entries(data).map(([key, value]) => ({
          id: key,
          ...value
        }));
        console.log("Entradas actualizadas:", entriesArray);
        setEntries(entriesArray);
      } else {
        console.log("No hay entradas en la base de datos");
        setEntries([]);
      }
    }, (error) => {
      console.error("Error al leer entradas:", error);
    });

    const unsubscribeCategories = onValue(categoriesRef, (snapshot) => {
      console.log("Recibiendo actualización de categorías");
      const data = snapshot.val();
      if (data && typeof data === 'object') {
        console.log("Categorías actualizadas:", data);
        setCategories({
          clients: Array.isArray(data.clients) ? data.clients : [],
          family: Array.isArray(data.family) ? data.family : []
        });
      } else {
        console.log("No hay categorías válidas en la base de datos");
        setCategories({ clients: [], family: [] });
      }
    }, (error) => {
      console.error("Error al leer categorías:", error);
    });

    return () => {
      console.log("Limpieza de useEffect");
      unsubscribeEntries();
      unsubscribeCategories();
    };
  }, []);

  const handleAddEntry = (e) => {
    e.preventDefault();
    console.log("Intentando agregar/actualizar entrada:", newEntry);
    const db = getFirebaseDatabase();
    if (!db) return;

    const entriesRef = ref(db, 'entries');
    if (editingEntry) {
      const entryRef = ref(db, `entries/${editingEntry.id}`);
      update(entryRef, newEntry)
        .then(() => {
          console.log('Entrada actualizada con éxito:', newEntry);
          setEditingEntry(null);
        })
        .catch((error) => {
          console.error('Error al actualizar entrada:', error);
        });
    } else {
      push(entriesRef, newEntry)
        .then((reference) => {
          console.log('Nueva entrada añadida con éxito. ID:', reference.key);
        })
        .catch((error) => {
          console.error('Error al añadir nueva entrada:', error);
        });
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
  };

  const handleEditEntry = (entry) => {
    console.log("Editando entrada:", entry);
    setEditingEntry(entry);
    setNewEntry(entry);
    setActiveTab('newEntry');
  };

  const handleDeleteEntry = (id) => {
    console.log("Eliminando entrada con ID:", id);
    const db = getFirebaseDatabase();
    if (!db) return;

    const entryRef = ref(db, `entries/${id}`);
    remove(entryRef)
      .then(() => {
        console.log('Entrada eliminada con éxito');
      })
      .catch((error) => {
        console.error('Error al eliminar entrada:', error);
      });
  };

  const handleAddCategory = (e) => {
    e.preventDefault();
    console.log("Intentando agregar categoría:", newCategory);
    const db = getFirebaseDatabase();
    if (!db) return;

    if (newCategory.name && !categories[newCategory.type].includes(newCategory.name)) {
      const updatedCategories = {
        ...categories,
        [newCategory.type]: Array.isArray(categories[newCategory.type])
          ? [...categories[newCategory.type], newCategory.name]
          : [newCategory.name]
      };
      const categoriesRef = ref(db, 'categories');
      set(categoriesRef, updatedCategories)
        .then(() => {
          console.log('Categoría añadida con éxito:', newCategory);
          setNewCategory({ ...newCategory, name: '' });
        })
        .catch((error) => {
          console.error('Error al añadir categoría:', error);
        });
    } else {
      console.log("Categoría inválida o ya existe");
    }
  };

  const handleDeleteCategory = (type, name) => {
    console.log("Eliminando categoría:", { type, name });
    const db = getFirebaseDatabase();
    if (!db) return;

    const updatedCategories = {
      ...categories,
      [type]: categories[type].filter(item => item !== name)
    };
    const categoriesRef = ref(db, 'categories');
    set(categoriesRef, updatedCategories)
      .then(() => {
        console.log('Categoría eliminada con éxito');
      })
      .catch((error) => {
        console.error('Error al eliminar categoría:', error);
      });
  };

  console.log("Antes de renderizar JSX");

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
                {Array.isArray(categories[newEntry.category]) 
                  ? categories[newEntry.category].map(item => (
                      <option key={item} value={item}>{item}</option>
                    ))
                  : null
                }
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
          <h2 className="text-2xl font-semibold text-indigo-600 mb-4">Historial</h2>
          {entries.map(entry => (
            <div key={entry.id} className="mb-4 p-4 border rounded">
              <p><strong>Fecha:</strong> {entry.date} {entry.time}</p>
            <p><strong>Categoría:</strong> {entry.category === 'clients' ? 'Cliente' : 'Familiar'}</p>
              <p><strong>{entry.category === 'clients' ? 'Cliente' : 'Familiar'}:</strong> {entry.categoryItem}</p>
              <p><strong>Cantidad de Artículos:</strong> {entry.articleQuantity}</p>
              <p><strong>Comentarios:</strong> {entry.comments}</p>
              <div className="mt-2">
                <button onClick={() => handleEditEntry(entry)} className="bg-blue-500 hover:bg-blue-600 text-white py-1 px-2 rounded mr-2">
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
              {Array.isArray(categories.clients) && categories.clients.map(client => (
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
              {Array.isArray(categories.family) && categories.family.map(family => (
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
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleError = (error) => {
      console.error("Error capturado:", error);
      setError(error);
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-red-100 text-red-900 p-8">
        <h1 className="text-3xl font-bold mb-4">Ocurrió un error</h1>
        <p>{error.message}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-4 bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded"
        >
          Recargar página
        </button>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <WorkLoggerApp />
    </ErrorBoundary>
  );
};

export default App;