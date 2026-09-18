import React, { useEffect, useState } from 'react';
import { api, errorMessage } from '../api';

interface Recipe {
  id: string;
  title: string;
  category: string;
  description: string;
  prepTimeMin: number;
  tags: string[];
  ingredients: { name: string; quantity?: string }[];
  steps: string[];
}

const CATEGORIES = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK', 'DESSERT', 'DRINK', 'TEA'];

function parseLines(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export function Recipes() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [listError, setListError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('BREAKFAST');
  const [description, setDescription] = useState('');
  const [prepTimeMin, setPrepTimeMin] = useState('10');
  const [ingredients, setIngredients] = useState('');
  const [steps, setSteps] = useState('');
  const [tags, setTags] = useState('');

  const load = () =>
    api
      .get('/recipes')
      .then((res) => {
        setRecipes(res.data);
        setListError(null);
      })
      .catch((err) => setListError(errorMessage(err)));

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setCategory('BREAKFAST');
    setDescription('');
    setPrepTimeMin('10');
    setIngredients('');
    setSteps('');
    setTags('');
    setShowForm(false);
  };

  const startEdit = (recipe: Recipe) => {
    setEditingId(recipe.id);
    setTitle(recipe.title);
    setCategory(recipe.category);
    setDescription(recipe.description);
    setPrepTimeMin(String(recipe.prepTimeMin));
    setIngredients(recipe.ingredients.map((i) => (i.quantity ? `${i.name} — ${i.quantity}` : i.name)).join('\n'));
    setSteps(recipe.steps.join('\n'));
    setTags(recipe.tags.join(', '));
    setShowForm(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        title,
        category,
        description,
        prepTimeMin: Number(prepTimeMin),
        ingredients: parseLines(ingredients).map((name) => ({ name })),
        steps: parseLines(steps),
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      };
      if (editingId) {
        await api.put(`/admin/recipes/${editingId}`, payload);
      } else {
        await api.post('/admin/recipes', payload);
      }
      resetForm();
      load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Excluir esta receita?')) return;
    try {
      await api.delete(`/admin/recipes/${id}`);
      load();
    } catch (err) {
      setListError(errorMessage(err));
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 className="page-title">Receitas</h2>
        <button className="btn" onClick={() => (showForm ? resetForm() : setShowForm(true))}>
          {showForm ? 'Cancelar' : '+ Nova receita'}
        </button>
      </div>

      {showForm && (
        <form className="card" onSubmit={submit} style={{ marginBottom: 24 }}>
          <div className="row">
            <div>
              <label>Título</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div>
              <label>Categoria</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          <label>Descrição</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} required />
          <div className="row">
            <div>
              <label>Tempo de preparo (min)</label>
              <input type="number" value={prepTimeMin} onChange={(e) => setPrepTimeMin(e.target.value)} />
            </div>
            <div>
              <label>Tags (separadas por vírgula)</label>
              <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="rapido, vegetariano" />
            </div>
          </div>
          <label>Ingredientes (um por linha)</label>
          <textarea rows={4} value={ingredients} onChange={(e) => setIngredients(e.target.value)} />
          <label>Modo de preparo (um passo por linha)</label>
          <textarea rows={4} value={steps} onChange={(e) => setSteps(e.target.value)} />
          {error && <div className="error-text">{error}</div>}
          <button className="btn" type="submit" disabled={saving}>
            {saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Salvar receita'}
          </button>
        </form>
      )}

      {listError && <div className="error-text">{listError}</div>}

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Título</th>
              <th>Categoria</th>
              <th>Tempo</th>
              <th>Tags</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {recipes.map((r) => (
              <tr key={r.id}>
                <td>{r.title}</td>
                <td>{r.category}</td>
                <td>{r.prepTimeMin} min</td>
                <td>{r.tags.join(', ')}</td>
                <td style={{ display: 'flex', gap: 8 }}>
                  <button className="btn outline" onClick={() => startEdit(r)}>Editar</button>
                  <button className="btn danger" onClick={() => remove(r.id)}>Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
