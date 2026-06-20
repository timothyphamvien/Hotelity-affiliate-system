import React from 'react';
import { Room, Property } from '../types';
import { Video } from 'lucide-react';

interface RoomCardProps {
  room: Room;
  matchedProp?: Property;
  parentLocation: string;
  expectedCommission: number;
  onSelect: (roomId: string) => void;
  onWatchVideo?: (videoUrl: string) => void;
}

export function RoomCard({
  room,
  matchedProp,
  parentLocation,
  expectedCommission,
  onSelect,
  onWatchVideo
}: RoomCardProps) {
  return (
    <div 
      className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col justify-between hover:shadow-md transition-all duration-200 font-sans"
    >
      <div>
        {/* Thumbnail */}
        <div 
          onClick={() => onSelect(room.id)}
          className="h-48 bg-slate-100 relative overflow-hidden cursor-pointer group"
          title="Click xem chi tiết Agoda/Booking"
        >
          <img 
            src={room.images[0]} 
            alt={room.name} 
            className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
          />

          {/* Left overlay buttons */}
          {room.videoUrl && onWatchVideo && (
            <button
              onClick={(e) => { e.stopPropagation(); onWatchVideo(room.videoUrl || ''); }}
              className="absolute top-3 left-3 bg-indigo-600/90 hover:bg-indigo-750 text-white p-2 rounded-full shadow-md flex items-center justify-center transition-transform hover:scale-110 cursor-pointer z-10"
              title="Xem tour thực tế"
            >
              <Video className="h-4 w-4" />
            </button>
          )}

          <span className="absolute bottom-3 left-3 bg-slate-900/90 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full font-mono z-10">
            Sức chứa: {room.maxGuests} khách
          </span>
        </div>
      </div>
    </div>
  );
}
