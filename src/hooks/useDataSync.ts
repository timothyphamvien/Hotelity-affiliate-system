import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';

/**
 * HOOK: useBookingsSync
 * Contextual Real-Time Synchronization & Cache Invalidator using @tanstack/react-query.
 * Handles server state queries, auto invalidation, and seamless optimistic updates on actions
 * like "Approve Deposit" or "Cancel Booking".
 */
export function useBookingsSync() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['bookings'],
    queryFn: async () => {
      return await api.getBookings();
    },
  });

  const mutation = useMutation({
    mutationFn: async (payload: { id: string; status: 'APPROVED' | 'CANCELLED'; paymentStatus?: string; bookingStatus?: string }) => {
      // Core direct integration call with REST api services
      await api.updateBookingStatus(payload.id, payload.status);
      if (payload.paymentStatus || payload.bookingStatus) {
        await api.updateBooking(payload.id, {
          paymentStatus: payload.paymentStatus as any,
          bookingStatus: payload.bookingStatus as any,
        });
      }
      return payload;
    },
    // Optimistic Update implementation
    onMutate: async (newBookingUpdate) => {
      // Cancel outgoing refetches so they don't overwrite optimistic update
      await queryClient.cancelQueries({ queryKey: ['bookings'] });

      // Snapshot the current state of cache
      const previousBookings = queryClient.getQueryData<any[]>(['bookings']);

      // Optimistically overwrite the cache state safely
      if (previousBookings) {
        queryClient.setQueryData<any[]>(['bookings'], (old) => {
          if (!old) return [];
          return old.map((b) =>
            b.id === newBookingUpdate.id
              ? { 
                  ...b, 
                  status: newBookingUpdate.status, 
                  paymentStatus: newBookingUpdate.paymentStatus || b.paymentStatus,
                  bookingStatus: newBookingUpdate.bookingStatus || b.bookingStatus
                }
              : b
          );
        });
      }

      // Return context for error recovery rollback mapping
      return { previousBookings };
    },
    // If mutation fails, rollback to saved context
    onError: (_err, _newBookingUpdate, context) => {
      if (context?.previousBookings) {
        queryClient.setQueryData(['bookings'], context.previousBookings);
      }
    },
    // Re-sync with actual database state on finish
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });

  return {
    bookings: query.data,
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    mutateBookingStatus: async (
      bookingId: string,
      newStatus: 'APPROVED' | 'CANCELLED',
      newPaymentStatus?: 'unpaid' | 'deposit_paid' | 'paid',
      newBookingStatus?: string
    ) => {
      return await mutation.mutateAsync({
        id: bookingId,
        status: newStatus,
        paymentStatus: newPaymentStatus,
        bookingStatus: newBookingStatus
      });
    }
  };
}

/**
 * HOOK: useRoomsSync
 * Manages PMS property room statuses, handling clean/dirty status, holds, 
 * and actual mechanical reservations locks.
 */
export function useRoomsSync() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['rooms'],
    queryFn: async () => {
      // Query physical rooms or map room capacities synchronously
      return [
        { id: '101', name: 'Phòng 101 - Bungalow Hoa Đào', status: 'available', cleanStatus: 'clean' },
        { id: '102', name: 'Phòng 102 - Bungalow Sườn Đồi', status: 'hold', cleanStatus: 'clean' },
        { id: '201', name: 'Phòng 201 - Deluxe View Suối', status: 'booked', cleanStatus: 'dirty' },
        { id: '202', name: 'Phòng 202 - Deluxe View Sân Vườn', status: 'cleaning', cleanStatus: 'cleaning' }
      ];
    },
  });

  const mutation = useMutation({
    mutationFn: async (payload: { id: string; status?: string; cleanStatus?: string }) => {
      // Mock microservice update for DB inventory
      return payload;
    },
    // Optimistic PMS status transformation
    onMutate: async (updatedRoom) => {
      await queryClient.cancelQueries({ queryKey: ['rooms'] });
      const previousRooms = queryClient.getQueryData<any[]>(['rooms']);

      if (previousRooms) {
        queryClient.setQueryData<any[]>(['rooms'], (old) => {
          if (!old) return [];
          return old.map((r) =>
            r.id === updatedRoom.id
              ? { ...r, ...updatedRoom }
              : r
          );
        });
      }

      return { previousRooms };
    },
    onError: (_err, _updatedRoom, context) => {
      if (context?.previousRooms) {
        queryClient.setQueryData(['rooms'], context.previousRooms);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
  });

  return {
    rooms: query.data,
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    mutateRoomState: async (roomId: string, updates: { status?: string; cleanStatus?: string }) => {
      return await mutation.mutateAsync({ id: roomId, ...updates });
    }
  };
}
