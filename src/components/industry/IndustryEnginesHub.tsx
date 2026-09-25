import React, { useState } from 'react';
import { HealthcareEngineView } from './HealthcareEngineView';
import { GymEngineView } from './GymEngineView';
import { RestaurantEngineView } from './RestaurantEngineView';
import { RepairEngineView } from './RepairEngineView';
import { RentalEngineView } from './RentalEngineView';
import {
  Stethoscope,
  Dumbbell,
  Utensils,
  Wrench,
  Car,
  Layers,
  ShieldCheck,
  Building2,
  CheckCircle2,
} from 'lucide-react';

export type IndustryType = 'HEALTHCARE' | 'GYM' | 'RESTAURANT' | 'REPAIR' | 'RENTAL';

export const IndustryEnginesHub: React.FC = () => {
  const [activeEngine, setActiveEngine] = useState<IndustryType>('HEALTHCARE');

  const engines = [
    {
      id: 'HEALTHCARE' as IndustryType,
      name: 'Healthcare & Clinic',
      icon: Stethoscope,
      badge: 'Protected Guard',
      color: 'text-rose-700 bg-rose-50 border-rose-200',
      description: 'Patient records, doctor schedules, double-booking guard & EHR logs',
    },
    {
      id: 'GYM' as IndustryType,
      name: 'Gym & Fitness',
      icon: Dumbbell,
      badge: 'Turnstile Active',
      color: 'text-amber-700 bg-amber-50 border-amber-200',
      description: 'Membership plans, freeze entitlement validation & attendance check-ins',
    },
    {
      id: 'RESTAURANT' as IndustryType,
      name: 'Restaurant & Dining',
      icon: Utensils,
      badge: 'Live Tables',
      color: 'text-orange-700 bg-orange-50 border-orange-200',
      description: 'Floor plan table status, Kitchen Order Tickets (KOT) & billing',
    },
    {
      id: 'REPAIR' as IndustryType,
      name: 'Repair Lab',
      icon: Wrench,
      badge: 'Diagnostics',
      color: 'text-blue-700 bg-blue-50 border-blue-200',
      description: 'Device intake job cards, status progression & parts/labor calculation',
    },
    {
      id: 'RENTAL' as IndustryType,
      name: 'Rental & Fleet',
      icon: Car,
      badge: 'Overlap Guard',
      color: 'text-teal-700 bg-teal-50 border-teal-200',
      description: 'Vehicle/equipment fleet, overlap prevention reservations & deposits',
    },
  ];

  return (
    <div className="space-y-6">
      {/* SECTOR SWITCHER RIBBON */}
      <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-2xs">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-neutral-100">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-[#68151F]" />
            <h2 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
              LUMORA Multi-Tenant Industry Engines Hub
            </h2>
          </div>
          <div className="flex items-center space-x-2 text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Strict Tenant Data Isolation Verified</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
          {engines.map((eng) => {
            const Icon = eng.icon;
            const isSelected = activeEngine === eng.id;

            return (
              <button
                key={eng.id}
                type="button"
                onClick={() => setActiveEngine(eng.id)}
                className={`p-3 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-neutral-900 text-white border-neutral-900 shadow-sm'
                    : 'bg-neutral-50/70 border-neutral-200 hover:bg-white hover:border-neutral-300 text-neutral-800'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-2">
                  <div
                    className={`p-1.5 rounded-lg ${
                      isSelected ? 'bg-white/20 text-white' : eng.color
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span
                    className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-neutral-200/60 text-neutral-600'
                    }`}
                  >
                    {eng.badge}
                  </span>
                </div>
                <div>
                  <div className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-neutral-900'}`}>
                    {eng.name}
                  </div>
                  <div
                    className={`text-[10px] mt-0.5 line-clamp-1 ${
                      isSelected ? 'text-neutral-300' : 'text-neutral-500'
                    }`}
                  >
                    {eng.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ACTIVE ENGINE CONTAINER */}
      <div>
        {activeEngine === 'HEALTHCARE' && <HealthcareEngineView />}
        {activeEngine === 'GYM' && <GymEngineView />}
        {activeEngine === 'RESTAURANT' && <RestaurantEngineView />}
        {activeEngine === 'REPAIR' && <RepairEngineView />}
        {activeEngine === 'RENTAL' && <RentalEngineView />}
      </div>
    </div>
  );
};
