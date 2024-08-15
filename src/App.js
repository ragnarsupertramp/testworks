import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, push, onValue, remove, update, set } from 'firebase/database';
import { format } from 'date-fns';

// Configuración de Firebase
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
console.log("Intentando conectar con Firebase...");
const connectedRef = ref(database, ".info/connected");
onValue(connectedRef, (snap) => {
  if (snap.val() === true) {
    console.log("Conectado a Firebase");
  } else {
    console.log("No conectado a Firebase");
  }
});
const database = getDatabase(app);

const WorkLoggerApp = () => {
  const [activeTab, setActiveTab] = useState('newEntry');
  const [entries, setEntries] = useState([]);
  const [categories, setCategories] = useState({ clients: [], family: [] });
  const [newEntry, setNewEntry] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    time: format(new Date(), 'HH:mm'),
    category: 'clients',
    categoryItem: '',
    comments: ''
  });
  const [editingEntry, setEditingEntry] = useState(null);
  const [newCategory, setNewCategory] = useState({ type: 'clients', name: '' });

  useEffect(() => {
    const entriesRef = ref(database, 'entries');
    const categoriesRef = ref(database, 'categories');

    const unsubscribeEntries = onValue(entriesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const entriesArray = Object.entries(data).map(([key, value]) => ({
          id: key,
          ...value
        }));
        setEntries(entriesArray);
      } else {
        setEntries([]);
      }
    }, (error) => {
      console.error("Error al leer entradas:", error);
    });

    const unsubscribeCategories = onValue(categoriesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setCategories(data);
      } else {
        setCategories({ clients: [], family: [] });
      }
    }, (error) => {
      console.error("Error al leer categorías:", error);
    });

    return () => {
      unsubscribeEntries();
      unsubscribeCategories();
    };
  }, []);

  const handleAddEntry = (e) => {
    e.preventDefault();
    const entriesRef = ref(database, 'entries');
    if (editingEntry) {
      const entryRef = ref(database, `entries/${editingEntry.id}`);
      update(entryRef, newEntry)
        .then(() => {
          console.log('Entrada actualizada con éxito');
          setEditingEntry(null);
        })
        .catch((error) => {
          console.error('Error al actualizar entrada:', error);
        });
    } else {
      push(entriesRef, newEntry)
        .then(() => {
          console.log('Nueva entrada añadida con éxito');
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
      comments: ''
    });
    setActiveTab('history');
  };

  const handleEditEntry = (entry) => {
    setEditingEntry(entry);
    setNewEntry(entry);
    setActiveTab('newEntry');
  };

  const handleDeleteEntry = (id) => {
    const entryRef = ref(database, `entries/${id}`);
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
    if (newCategory.name && !categories[newCategory.type].includes(newCategory.name)) {
      const updatedCategories = {
        ...categories,
        [newCategory.type]: [...categories[newCategory.type], newCategory.name]
      };
      const categoriesRef = ref(database, 'categories');
      set(categoriesRef, updatedCategories)
        .then(() => {
          console.log('Categoría añadida con éxito');
          setNewCategory({ ...newCategory, name: '' });
        })
        .catch((error) => {
          console.error('Error al añadir categoría:', error);
        });
    }
  };

  const handleDeleteCategory = (type, name) => {
    const updatedCategories = {
      ...categories,
      [type]: categories[type].filter(item => item !== name)
    };
    const categoriesRef = ref(database, 'categories');
    set(categoriesRef, updatedCategories)
      .then(() => {
        console.log('Categoría eliminada con éxito');
      })
      .catch((error) => {
        console.error('Error al eliminar categoría:', error);
      });
  };

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

export default WorkLoggerApp;