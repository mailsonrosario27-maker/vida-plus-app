import React, { useEffect, useState } from 'react';
import { api, errorMessage } from '../api';

interface WorkoutItem {
  name: string;
  durationSec?: number;
  reps?: number;
  restSec?: number;
  instructions?: string;
}

interface Workout {
  id: string;
  title: string;
  level: string;
  category: string;
  durationMin: number;
  description: string;
  items: WorkoutItem[];
}

const LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];
const CATEGORIES = ['WALK', 'RUN', 'BIKE', 'HOME', 'MOBILITY', 'STRETCH', 'STRENGTH'];

function parseLines(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export function Workouts() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [listError, setListError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [level, setLevel] = useState('BEGINNER');
  const [category, setCategory] = useState('HOME');
  const [durationMin, setDurationMin] = useState('20');
  const [description, setDescription] = useState('');
  const [itemsText, setItemsText] = useState('');

  const load = () =>
    api
      .get('/workouts')
      .then((res) => {
        setWorkouts(res.data);
        setListError(null);
      })
      .catch((err) => setListError(errorMessage(err)));

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setLevel('BEGINNER');
    setCategory('HOME');
    setDurationMin('20');
    setDescription('');
    setItemsText('');
    setShowForm(false);
  };

  const startEdit = (workout: Workout) => {
    setEditingId(workout.id);
    setTitle(workout.title);
    setLevel(workout.level);
    setCategory(workout.category);
    setDurationMin(String(workout.durationMin));
    setDescription(workout.description);
    setItemsText(workout.items.map((i) => i.name).join('\n'));
    setShowForm(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        title,
        level,
        category,
        durationMin: Number(durationMin),
        description,
        items: parseLines(itemsText).map((name) => ({ name })),
      };
      if (editingId) {
        await api.put(`/admin/workouts/${editingId}`, payload);
      } else {
        await api.post('/admin/workouts', payload);
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
    if (!confirm('Excluir este treino?')) return;
    try {
      await api.delete(`/admin/workouts/${id}`);
      load();
    } catch (err) {
      setListError(errorMessage(err));
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 className="page-title">Treinos</h2>
        <button className="btn" onClick={() => (showForm ? resetForm() : setShowForm(true))}>
          {showForm ? 'Cancelar' : '+ Novo treino'}
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
              <label>Duração (min)</label>
              <input type="number" value={durationMin} onChange={(e) => setDurationMin(e.target.value)} />
            </div>
          </div>
          <div className="row">
            <div>
              <label>Nível</label>
              <select value={level} onChange={(e) => setLevel(e.target.value)}>
                {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label>Categoria</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <label>Descrição</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} required />
          <label>Exercícios (um nome por linha)</label>
          <textarea rows={4} value={itemsText} onChange={(e) => setItemsText(e.target.value)} />
          {error && <div className="error-text">{error}</div>}
          <button className="btn" type="submit" disabled={saving}>
            {saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Salvar treino'}
          </button>
        </form>
      )}

      {listError && <div className="error-text">{listError}</div>}

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Título</th>
              <th>Nível</th>
              <th>Categoria</th>
              <th>Duração</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {workouts.map((w) => (
              <tr key={w.id}>
                <td>{w.title}</td>
                <td>{w.level}</td>
                <td>{w.category}</td>
                <td>{w.durationMin} min</td>
                <td style={{ display: 'flex', gap: 8 }}>
                  <button className="btn outline" onClick={() => startEdit(w)}>Editar</button>
                  <button className="btn danger" onClick={() => remove(w.id)}>Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
