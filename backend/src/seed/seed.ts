import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';

async function main() {
  console.log('Seeding VIDA+...');

  // --- Admin ---
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@vidaplus.app';
  const adminPassword = process.env.ADMIN_PASSWORD || 'VidaPlus@2026';
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: await bcrypt.hash(adminPassword, 10),
        role: 'ADMIN',
        profile: { create: { name: 'Administrador VIDA+' } },
      },
    });
    console.log(`Admin criado: ${adminEmail}`);
  }

  // --- Receitas ---
  const recipes = [
    {
      title: 'Omelete de espinafre com aveia',
      category: 'BREAKFAST' as const,
      period: 'MORNING' as const,
      description: 'Café da manhã rico em proteína, rápido de preparar.',
      ingredients: [
        { name: 'Ovos', quantity: '2 unidades' },
        { name: 'Espinafre', quantity: '1 punhado' },
        { name: 'Aveia em flocos', quantity: '2 colheres de sopa' },
        { name: 'Sal e pimenta', quantity: 'a gosto' },
      ],
      steps: ['Bata os ovos com sal e pimenta.', 'Misture o espinafre picado e a aveia.', 'Cozinhe em frigideira antiaderente por 3-4 min de cada lado.'],
      prepTimeMin: 10,
      difficulty: 'EASY' as const,
      calories: 290,
      proteinG: 20,
      carbsG: 18,
      fatG: 14,
      tags: ['rapido', 'rico-em-proteina', 'sem-gluten'],
    },
    {
      title: 'Iogurte natural com frutas vermelhas e chia',
      category: 'BREAKFAST' as const,
      period: 'MORNING' as const,
      description: 'Opção fresca e prática para dias corridos.',
      ingredients: [
        { name: 'Iogurte natural', quantity: '200g' },
        { name: 'Frutas vermelhas', quantity: '1 xícara' },
        { name: 'Sementes de chia', quantity: '1 colher de sopa' },
      ],
      steps: ['Misture o iogurte com as frutas.', 'Finalize com as sementes de chia.'],
      prepTimeMin: 5,
      difficulty: 'EASY' as const,
      calories: 210,
      proteinG: 12,
      carbsG: 28,
      fatG: 5,
      tags: ['rapido', 'poucos-ingredientes', 'sem-gluten'],
    },
    {
      title: 'Frango grelhado com arroz integral e brócolis',
      category: 'LUNCH' as const,
      period: 'AFTERNOON' as const,
      description: 'Almoço equilibrado com proteína magra e fibras.',
      ingredients: [
        { name: 'Peito de frango', quantity: '150g' },
        { name: 'Arroz integral cozido', quantity: '4 colheres de sopa' },
        { name: 'Brócolis', quantity: '1 xícara' },
        { name: 'Azeite', quantity: '1 colher de chá' },
      ],
      steps: ['Tempere e grelhe o frango.', 'Cozinhe o brócolis no vapor.', 'Monte o prato com o arroz e finalize com azeite.'],
      prepTimeMin: 25,
      difficulty: 'MEDIUM' as const,
      calories: 420,
      proteinG: 38,
      carbsG: 35,
      fatG: 12,
      tags: ['rico-em-proteina', 'sem-lactose', 'sem-gluten'],
    },
    {
      title: 'Salada de grão-de-bico com legumes',
      category: 'LUNCH' as const,
      period: 'AFTERNOON' as const,
      description: 'Opção vegetariana, rica em fibras e econômica.',
      ingredients: [
        { name: 'Grão-de-bico cozido', quantity: '1 xícara' },
        { name: 'Tomate', quantity: '1 unidade' },
        { name: 'Pepino', quantity: '1/2 unidade' },
        { name: 'Azeite e limão', quantity: 'a gosto' },
      ],
      steps: ['Misture todos os ingredientes.', 'Tempere com azeite, limão, sal e ervas.'],
      prepTimeMin: 10,
      difficulty: 'EASY' as const,
      calories: 320,
      proteinG: 14,
      carbsG: 42,
      fatG: 10,
      tags: ['vegetariano', 'economico', 'sem-lactose', 'sem-gluten'],
    },
    {
      title: 'Salmão assado com legumes',
      category: 'DINNER' as const,
      period: 'NIGHT' as const,
      description: 'Jantar leve e rico em ômega-3.',
      ingredients: [
        { name: 'Filé de salmão', quantity: '150g' },
        { name: 'Abobrinha', quantity: '1/2 unidade' },
        { name: 'Cenoura', quantity: '1 unidade' },
        { name: 'Azeite e ervas', quantity: 'a gosto' },
      ],
      steps: ['Tempere o salmão e os legumes.', 'Asse a 200°C por 18-20 minutos.'],
      prepTimeMin: 30,
      difficulty: 'MEDIUM' as const,
      calories: 380,
      proteinG: 32,
      carbsG: 14,
      fatG: 20,
      tags: ['rico-em-proteina', 'sem-lactose', 'sem-gluten'],
    },
    {
      title: 'Sopa de legumes com lentilha',
      category: 'DINNER' as const,
      period: 'NIGHT' as const,
      description: 'Jantar reconfortante, ótimo para dias frios.',
      ingredients: [
        { name: 'Lentilha', quantity: '1/2 xícara' },
        { name: 'Cenoura, abobrinha e chuchu', quantity: '1 xícara' },
        { name: 'Caldo de legumes', quantity: '500ml' },
      ],
      steps: ['Refogue os legumes.', 'Adicione a lentilha e o caldo.', 'Cozinhe por 25 minutos.'],
      prepTimeMin: 35,
      difficulty: 'EASY' as const,
      calories: 260,
      proteinG: 15,
      carbsG: 40,
      fatG: 4,
      tags: ['vegetariano', 'economico', 'sem-lactose', 'sem-gluten'],
    },
    {
      title: 'Mix de castanhas e frutas secas',
      category: 'SNACK' as const,
      period: 'ANY' as const,
      description: 'Lanche prático para levar na bolsa.',
      ingredients: [{ name: 'Castanhas variadas', quantity: '1 punhado' }, { name: 'Frutas secas', quantity: '1 punhado' }],
      steps: ['Misture tudo em um potinho.'],
      prepTimeMin: 2,
      difficulty: 'EASY' as const,
      calories: 180,
      proteinG: 5,
      carbsG: 12,
      fatG: 13,
      tags: ['rapido', 'poucos-ingredientes'],
    },
    {
      title: 'Palitos de vegetais com homus',
      category: 'SNACK' as const,
      period: 'ANY' as const,
      description: 'Lanche crocante e leve.',
      ingredients: [{ name: 'Cenoura e pepino', quantity: '1 xícara' }, { name: 'Homus', quantity: '3 colheres de sopa' }],
      steps: ['Corte os vegetais em palitos.', 'Sirva com o homus.'],
      prepTimeMin: 8,
      difficulty: 'EASY' as const,
      calories: 140,
      proteinG: 5,
      carbsG: 16,
      fatG: 6,
      tags: ['vegetariano', 'rapido', 'sem-lactose', 'sem-gluten'],
    },
    {
      title: 'Mousse de cacau com abacate',
      category: 'DESSERT' as const,
      period: 'ANY' as const,
      description: 'Sobremesa cremosa sem açúcar refinado.',
      ingredients: [{ name: 'Abacate', quantity: '1 unidade' }, { name: 'Cacau em pó', quantity: '2 colheres de sopa' }, { name: 'Mel ou tâmaras', quantity: 'a gosto' }],
      steps: ['Bata tudo no liquidificador até ficar cremoso.', 'Leve à geladeira por 30 minutos.'],
      prepTimeMin: 10,
      difficulty: 'EASY' as const,
      calories: 220,
      proteinG: 4,
      carbsG: 20,
      fatG: 15,
      tags: ['vegetariano', 'sem-gluten', 'sem-lactose'],
    },
    {
      title: 'Água saborizada com limão e hortelã',
      category: 'DRINK' as const,
      period: 'ANY' as const,
      description: 'Ajuda a variar o sabor da água ao longo do dia.',
      ingredients: [{ name: 'Água', quantity: '1 litro' }, { name: 'Limão', quantity: '1/2 unidade' }, { name: 'Hortelã', quantity: 'algumas folhas' }],
      steps: ['Adicione o limão fatiado e a hortelã na água.', 'Deixe descansar 15 minutos na geladeira.'],
      prepTimeMin: 5,
      difficulty: 'EASY' as const,
      tags: ['rapido', 'poucos-ingredientes'],
      cautions: 'Pode fazer parte de uma rotina saudável de hidratação.',
    },
    {
      title: 'Chá de camomila',
      category: 'TEA' as const,
      period: 'NIGHT' as const,
      description: 'Costuma ser usado antes de dormir como parte da rotina noturna.',
      ingredients: [{ name: 'Flores de camomila', quantity: '1 colher de chá' }, { name: 'Água quente', quantity: '200ml' }],
      steps: ['Deixe as flores em infusão por 5 minutos.', 'Coe e sirva.'],
      prepTimeMin: 6,
      difficulty: 'EASY' as const,
      tags: ['sem-lactose', 'sem-gluten'],
      bestTime: 'Antes de dormir',
      cautions: 'Pode auxiliar no relaxamento noturno. Gestantes e pessoas em uso de medicamentos devem consultar um profissional antes do uso regular.',
    },
    {
      title: 'Chá verde',
      category: 'TEA' as const,
      period: 'MORNING' as const,
      description: 'Pode fazer parte de uma rotina saudável pela manhã.',
      ingredients: [{ name: 'Folhas de chá verde', quantity: '1 colher de chá' }, { name: 'Água quente (não fervente)', quantity: '200ml' }],
      steps: ['Deixe em infusão por 2-3 minutos.', 'Coe e sirva.'],
      prepTimeMin: 5,
      difficulty: 'EASY' as const,
      tags: ['sem-lactose', 'sem-gluten'],
      bestTime: 'Manhã',
      cautions: 'Contém cafeína — evite no período noturno e consulte um profissional se estiver grávida, amamentando ou fazendo uso de medicamentos.',
    },
  ];

  for (const recipe of recipes) {
    const exists = await prisma.recipe.findFirst({ where: { title: recipe.title } });
    if (!exists) await prisma.recipe.create({ data: recipe });
  }

  // --- Treinos ---
  const workouts = [
    {
      title: 'Caminhada leve para iniciantes',
      level: 'BEGINNER' as const,
      category: 'WALK' as const,
      durationMin: 20,
      description: 'Ótimo ponto de partida para quem está voltando a se movimentar.',
      items: [
        { name: 'Aquecimento - caminhada lenta', durationSec: 300, instructions: 'Ritmo confortável.' },
        { name: 'Caminhada moderada', durationSec: 600, instructions: 'Aumente levemente o ritmo.' },
        { name: 'Desaquecimento', durationSec: 300, instructions: 'Volte ao ritmo lento.' },
      ],
    },
    {
      title: 'Mobilidade e alongamento matinal',
      level: 'BEGINNER' as const,
      category: 'MOBILITY' as const,
      durationMin: 15,
      description: 'Solta o corpo para começar o dia com mais disposição.',
      items: [
        { name: 'Rotação de ombros', reps: 15, instructions: 'Movimentos amplos e controlados.' },
        { name: 'Alongamento de posterior de coxa', durationSec: 60, instructions: 'Sem forçar, respire fundo.' },
        { name: 'Gato-vaca (mobilidade de coluna)', reps: 10, instructions: 'Sincronize com a respiração.' },
      ],
    },
    {
      title: 'Treino funcional em casa',
      level: 'INTERMEDIATE' as const,
      category: 'HOME' as const,
      durationMin: 30,
      description: 'Treino completo sem equipamentos, direto na sala de casa.',
      items: [
        { name: 'Aquecimento', durationSec: 300, instructions: 'Polichinelos e mobilidade articular.' },
        { name: 'Agachamento', reps: 15, restSec: 30, instructions: 'Mantenha a coluna neutra.' },
        { name: 'Flexão de braço', reps: 10, restSec: 30, instructions: 'Pode apoiar os joelhos se necessário.' },
        { name: 'Prancha', durationSec: 40, restSec: 30, instructions: 'Abdômen contraído.' },
        { name: 'Alongamento final', durationSec: 300, instructions: 'Foque nos grupos musculares trabalhados.' },
      ],
    },
    {
      title: 'Corrida intervalada',
      level: 'ADVANCED' as const,
      category: 'RUN' as const,
      durationMin: 35,
      description: 'Treino intervalado para melhorar condicionamento cardiovascular.',
      items: [
        { name: 'Aquecimento - trote leve', durationSec: 480 },
        { name: 'Tiro rápido', durationSec: 60, restSec: 90, instructions: 'Repita 6 vezes.' },
        { name: 'Desaquecimento - caminhada', durationSec: 300 },
      ],
    },
    {
      title: 'Força com peso corporal',
      level: 'INTERMEDIATE' as const,
      category: 'STRENGTH' as const,
      durationMin: 25,
      description: 'Foco em força usando apenas o peso do corpo.',
      items: [
        { name: 'Afundo alternado', reps: 12, restSec: 30 },
        { name: 'Ponte de glúteo', reps: 15, restSec: 30 },
        { name: 'Prancha lateral', durationSec: 30, restSec: 30 },
      ],
    },
  ];

  for (const workout of workouts) {
    const exists = await prisma.workout.findFirst({ where: { title: workout.title } });
    if (!exists) await prisma.workout.create({ data: workout });
  }

  // --- Conquistas ---
  const achievements = [
    { code: 'first_day', title: 'Primeiro dia concluído', description: 'Você registrou sua primeira atividade no VIDA+.', icon: '🏆', criteriaType: 'first_day', criteriaValue: 1 },
    { code: 'streak_3', title: '3 dias seguidos', description: 'Consistência começando a virar hábito.', icon: '🔥', criteriaType: 'streak_3', criteriaValue: 3 },
    { code: 'streak_7', title: '7 dias seguidos', description: 'Uma semana inteira de cuidado com você.', icon: '🔥', criteriaType: 'streak_7', criteriaValue: 7 },
    { code: 'streak_30', title: '30 dias de consistência', description: 'Um mês construindo uma rotina mais saudável.', icon: '🏅', criteriaType: 'streak_30', criteriaValue: 30 },
    { code: 'workouts_10', title: '10 treinos realizados', description: 'Movimento virando parte da sua rotina.', icon: '🏃', criteriaType: 'workouts_10', criteriaValue: 10 },
    { code: 'water_goal_hit', title: 'Meta de hidratação atingida', description: 'Você bateu sua meta diária de água.', icon: '💧', criteriaType: 'water_goal_hit', criteriaValue: 1 },
    { code: 'meals_10', title: '10 refeições registradas', description: 'Acompanhando sua alimentação de perto.', icon: '🥗', criteriaType: 'meals_10', criteriaValue: 10 },
  ];

  for (const achievement of achievements) {
    await prisma.achievement.upsert({
      where: { code: achievement.code },
      create: achievement,
      update: achievement,
    });
  }

  console.log('Seed concluído.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
