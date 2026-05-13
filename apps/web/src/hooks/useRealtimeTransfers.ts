'use client';

import { useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSocketEvent } from './useSocket';
import { useNotificationStore } from '@/stores/notification-store';
import toast from 'react-hot-toast';

export function useRealtimeDashboard() {
  const queryClient = useQueryClient();
  const invalidateDashboard = useRef(() => {
    queryClient.invalidateQueries({ queryKey: ['full-dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
  });

  useSocketEvent('dashboard.metrics_updated', () => {
    invalidateDashboard.current();
  });

  useSocketEvent('dashboard.alert_created', (payload) => {
    invalidateDashboard.current();
  });
}

export function useRealtimeTransfers() {
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((s) => s.addNotification);

  const refreshTransfers = useRef(() => {
    queryClient.invalidateQueries({ queryKey: ['transfers'] });
  });

  const refreshTransfer = useRef((id: string) => {
    queryClient.invalidateQueries({ queryKey: ['transfer', id] });
    queryClient.invalidateQueries({ queryKey: ['transfers'] });
    queryClient.invalidateQueries({ queryKey: ['full-dashboard'] });
  });

  useSocketEvent('transfer.created', (payload) => {
    refreshTransfers.current();
    const p = payload.data;
    toast.success(`New transfer: ${p.patientName || 'Patient'} (${p.origin} → ${p.destination})`, {
      duration: 4000,
    });
  });

  useSocketEvent('transfer.status_changed', (payload) => {
    const p = payload.data;
    refreshTransfer.current(p.transferId);
  });

  useSocketEvent('transfer.cancelled', (payload) => {
    const p = payload.data;
    refreshTransfer.current(p.transferId);
    toast(`Transfer cancelled`, { icon: '🚫' });
  });

  useSocketEvent('transfer.updated', (payload) => {
    const p = payload.data;
    refreshTransfer.current(p.transferId);
  });

  useSocketEvent('assignment.created', (payload) => {
    const p = payload.data;
    refreshTransfer.current(p.transferId);
    if (p.transporterName) {
      toast.success(`Assigned: ${p.transporterName}`);
    }
  });

  useSocketEvent('assignment.reassigned', (payload) => {
    const p = payload.data;
    refreshTransfer.current(p.transferId);
    toast(`Transporter reassigned`, { icon: '🔄' });
  });

  useSocketEvent('assignment.unassigned', (payload) => {
    const p = payload.data;
    refreshTransfer.current(p.transferId);
    toast(`Transporter unassigned`, { icon: '↩️' });
  });

  useSocketEvent('transporter.status_changed', () => {
    queryClient.invalidateQueries({ queryKey: ['available-transporters'] });
    queryClient.invalidateQueries({ queryKey: ['full-dashboard'] });
  });

  useSocketEvent('comment.created', (payload) => {
    const p = payload.data;
    if (p.transferId) {
      queryClient.invalidateQueries({ queryKey: ['comments', p.transferId] });
      queryClient.invalidateQueries({ queryKey: ['transfer', p.transferId] });
    }
  });

  useSocketEvent('comment.important', () => {
    queryClient.invalidateQueries({ queryKey: ['full-dashboard'] });
  });

  useSocketEvent('security.incident_created', () => {
    queryClient.invalidateQueries({ queryKey: ['full-dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['security-incidents'] });
  });
}
