import { Room } from '../types';

export interface KiotVietRoomStatus {
  roomId: string;
  roomName: string;
  kiotStatus: 'EMPTY' | 'BOOKED' | 'CHECKING_IN' | 'CLEANING';
  housekeeping: 'dirty' | 'clean' | 'cleaning';
  currentPrice: number;
  lastUpdated: string;
}

export class KiotVietService {
  /**
   * Fetches real-time room availability updates from KiotViet API
   */
  static async fetchRealtimeInventory(
    clientId: string,
    secret: string,
    branchName: string
  ): Promise<KiotVietRoomStatus[]> {
    if (!clientId || !secret) {
      throw new Error('Thiếu thốn thông tin xác thực KiotViet Hotel Client ID / Secret.');
    }

    // Simulate calling the real-time inventory API of KiotViet Hotel channels
    return [
      {
        roomId: 'room_da_lat_1',
        roomName: 'Bungalow Rừng Thông Standard (DA_LAT_1)',
        kiotStatus: 'EMPTY',
        housekeeping: 'clean',
        currentPrice: 420000,
        lastUpdated: new Date().toISOString()
      },
      {
        roomId: 'room_da_lat_2',
        roomName: 'Bungalow Family Rừng Thông (DA_LAT_2)',
        kiotStatus: 'BOOKED',
        housekeeping: 'dirty',
        currentPrice: 950000,
        lastUpdated: new Date().toISOString()
      },
      {
        roomId: 'room_da_nang_1',
        roomName: 'Deluxe SeaView Twin Villa (DA_NANG_1)',
        kiotStatus: 'CHECKING_IN',
        housekeeping: 'cleaning',
        currentPrice: 1850000,
        lastUpdated: new Date().toISOString()
      },
      {
        roomId: 'room_da_nang_2',
        roomName: 'Ocean President Villa (DA_NANG_2)',
        kiotStatus: 'EMPTY',
        housekeeping: 'clean',
        currentPrice: 4500000,
        lastUpdated: new Date().toISOString()
      }
    ];
  }

  /**
   * Integrates and mirrors KiotViet status records to local rooms model.
   * Ensures cleanliness and availability are synchronized automatically.
   */
  static updateLocalWithKiotRecords(
    localRooms: Room[],
    kiotRecords: KiotVietRoomStatus[]
  ): Room[] {
    return localRooms.map((localRoom) => {
      const match = kiotRecords.find((kr) => kr.roomId === localRoom.id);
      if (!match) return localRoom;

      // Status mapping
      let localStatus: 'available' | 'booked' | 'checked_in' = 'available';
      if (match.kiotStatus === 'BOOKED') {
        localStatus = 'booked';
      } else if (match.kiotStatus === 'CHECKING_IN') {
        localStatus = 'checked_in';
      }

      let mappedHousekeeping: 'clean' | 'dirty' | 'inspecting' = 'clean';
      if (match.housekeeping === 'dirty') {
        mappedHousekeeping = 'dirty';
      } else if (match.housekeeping === 'cleaning') {
        mappedHousekeeping = 'inspecting';
      }

      return {
        ...localRoom,
        status: localStatus,
        housekeepingStatus: mappedHousekeeping,
        clientPrice: match.currentPrice,
        // Sync note log
        description: localRoom.description?.includes('KiotViet') 
          ? localRoom.description 
          : (localRoom.description || '') + ' [KiotViet Channel-Synced]'
      };
    });
  }
}
