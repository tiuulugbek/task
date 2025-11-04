'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store/auth';
import { useRouter } from 'next/navigation';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://task.acoustic.uz/api';

export default function Dashboard() {
  const router = useRouter();
  const { user, loading, fetchUser } = useAuthStore();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      fetchMyTasks();
    }
  }, [user]);

  const fetchMyTasks = async () => {
    try {
      const response = await axios.get(`${API_URL}/tasks/search?assigneeId=${user?.id}`, {
        withCredentials: true,
      });
      if (response.data.success) {
        setTasks(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setLoadingTasks(false);
    }
  };

  if (loading || loadingTasks) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Dashboard</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-6 rounded-2xl shadow-soft">
            <h2 className="text-lg font-semibold text-gray-700 mb-2">My Tasks</h2>
            <p className="text-3xl font-bold text-primary">{tasks.length}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-soft">
            <h2 className="text-lg font-semibold text-gray-700 mb-2">Due Today</h2>
            <p className="text-3xl font-bold text-secondary">
              {tasks.filter(t => {
                const due = new Date(t.dueAt);
                const today = new Date();
                return due.toDateString() === today.toDateString();
              }).length}
            </p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-soft">
            <h2 className="text-lg font-semibold text-gray-700 mb-2">In Progress</h2>
            <p className="text-3xl font-bold text-orange-600">
              {tasks.filter(t => t.status === 'IN_PROGRESS').length}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-soft p-6">
          <h2 className="text-xl font-semibold mb-4">Recent Tasks</h2>
          <div className="space-y-2">
            {tasks.slice(0, 10).map((task) => (
              <div
                key={task.id}
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                onClick={() => router.push(`/tasks/${task.id}`)}
              >
                <h3 className="font-medium">{task.title}</h3>
                <p className="text-sm text-gray-500">{task.status} • {task.priority}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
