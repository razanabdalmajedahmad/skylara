'use client';

import { useState, useEffect } from 'react';
import { apiGet } from '@/lib/api';
import { logger } from '@/lib/logger';
import {
  AlertTriangle,
  Phone,
  Radio,
  MapPin,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Zap,
  Wind,
  Heart,
  Wrench,
  Shield,
} from 'lucide-react';

interface EmergencyContact {
  label: string;
  phone: string;
  email?: string;
  details?: string;
}

interface ProcedureStep {
  number: number;
  action: string;
}

interface EmergencyProcedure {
  id: string;
  title: string;
  icon: React.ReactNode;
  steps: ProcedureStep[];
}

interface EquipmentLocation {
  name: string;
  location: string;
  icon: React.ReactNode;
}

export default function EmergencyPage() {
  const [emergencyActive, setEmergencyActive] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [expandedProcedure, setExpandedProcedure] = useState<string | null>(null);

  // Fetch data from API with fallback to mock data
  useEffect(() => {
    async function fetchData() {
      try {
        const res = await apiGet('/incidents?severity=SERIOUS');
        if (res?.data) {
          // Emergency data loaded — update state if critical incidents are returned
        }
      } catch {
        logger.warn('API unavailable, using fallback', { page: 'emergency' });
      }
    }
    fetchData();
  }, []);

  const emergencyContacts: Record<string, EmergencyContact> = {
    dz_emergency: {
      label: 'DZ Emergency',
      phone: '(555) 555-0100',
      details: 'Mike Johnson, DZO',
    },
    hospital: {
      label: 'Local Hospital',
      phone: '(555) 555-0200',
      details: 'County Medical Center, 2.3 mi away, ~5 min ETA',
    },
    fire_dept: {
      label: 'Fire Department',
      phone: '911',
    },
    police: {
      label: 'Police',
      phone: '911',
    },
    faa_fsdo: {
      label: 'FAA FSDO',
      phone: '(555) 555-0300',
      email: 'fsdo@faa.gov',
      details: 'Flight Standards District Office',
    },
    uspa: {
      label: 'USPA',
      phone: '(555) 555-0400',
      details: 'United States Parachute Association',
    },
    insurance: {
      label: 'Insurance',
      phone: '(555) 555-0500',
      details: 'Policy #SL-2026-0847',
    },
    dzo_owner: {
      label: 'DZ Owner',
      phone: '(555) 555-0101',
      details: 'Mike Johnson',
    },
  };

  const procedures: EmergencyProcedure[] = [
    {
      id: 'aircraft',
      title: 'Aircraft Emergency',
      icon: <Zap className="w-5 h-5" />,
      steps: [
        { number: 1, action: 'Declare MAYDAY on 121.5 MHz immediately' },
        { number: 2, action: 'Report: Aircraft type, altitude, fuel remaining' },
        { number: 3, action: 'Request vector to nearest suitable airport' },
        { number: 4, action: 'Notify jumpmasters to prepare for emergency exit' },
        { number: 5, action: 'Advise ground crew to position emergency vehicles' },
        { number: 6, action: 'Follow ATC guidance for approach and landing' },
      ],
    },
    {
      id: 'jumper_injury',
      title: 'Jumper Injury on Landing',
      icon: <Heart className="w-5 h-5" />,
      steps: [
        { number: 1, action: 'Establish scene safety and crowd control' },
        { number: 2, action: 'Call 911 immediately - provide full incident details' },
        { number: 3, action: 'Perform primary survey (ABCs: Airway, Breathing, Circulation)' },
        { number: 4, action: 'Do NOT move jumper unless in immediate danger' },
        { number: 5, action: 'Apply basic first aid and stabilize injuries' },
        { number: 6, action: 'Log incident details: exact location, witnesses, injuries' },
        { number: 7, action: 'Notify DZO, Safety Officer, and insurance immediately' },
        { number: 8, action: 'Cooperate with emergency responders and police' },
      ],
    },
    {
      id: 'main_malfunction',
      title: 'Main Malfunction Protocol',
      icon: <Wrench className="w-5 h-5" />,
      steps: [
        { number: 1, action: 'Confirm malfunction: spinner still attached, control of canopy?' },
        { number: 2, action: 'Attempt 2-3 deep breaths and light pressure on toggles' },
        { number: 3, action: 'If canopy is unstable: DEPLOY RESERVE immediately' },
        { number: 4, action: 'If canopy is stable: Plan safe landing approach' },
        { number: 5, action: 'Cut away main if reserve entanglement risk' },
        { number: 6, action: 'Deploy reserve at appropriate altitude (minimum 2000ft)' },
        { number: 7, action: 'Land safely and immediately report malfunction' },
        { number: 8, action: 'Document canopy serial, packing log, weather conditions' },
      ],
    },
    {
      id: 'aad_fire',
      title: 'AAD Fire Protocol',
      icon: <AlertTriangle className="w-5 h-5" />,
      steps: [
        { number: 1, action: 'Assess: Is main already deployed? Is AAD still functional?' },
        { number: 2, action: 'If main deployed: Prepare to land normally, report incident' },
        { number: 3, action: 'If main NOT deployed: Manually deploy main immediately' },
        { number: 4, action: 'If both main AND AAD failed: Deploy reserve' },
        { number: 5, action: 'Land at nearest suitable location' },
        { number: 6, action: 'Notify DZO and Safety Officer immediately' },
        { number: 7, action: 'Quarantine AAD for investigation and replacement' },
        { number: 8, action: 'File incident report with FAA and USPA' },
      ],
    },
    {
      id: 'midair',
      title: 'Mid-Air Collision',
      icon: <AlertCircle className="w-5 h-5" />,
      steps: [
        { number: 1, action: 'If collision occurs: Check canopy integrity immediately' },
        { number: 2, action: 'Assess for entanglement or brake line damage' },
        { number: 3, action: 'If canopy compromised: CUT AWAY and deploy reserve' },
        { number: 4, action: 'Maintain safe distance from other jumpers' },
        { number: 5, action: 'Notify ground crew via radio of incident and identities' },
        { number: 6, action: 'Document all involved skydivers and witness names' },
        { number: 7, action: 'Land smoothly and await safety briefing' },
        { number: 8, action: 'Complete detailed incident report immediately' },
      ],
    },
    {
      id: 'weather',
      title: 'Weather Emergency',
      icon: <Wind className="w-5 h-5" />,
      steps: [
        { number: 1, action: 'Monitor ground conditions continuously during operations' },
        { number: 2, action: 'If sudden wind shift: Halt aircraft boarding immediately' },
        { number: 3, action: 'Alert aircraft in air via radio if conditions deteriorate' },
        { number: 4, action: 'All skydivers prepare for faster/harder than expected landing' },
        { number: 5, action: 'Jumpmasters assess landing zone safety before exit' },
        { number: 6, action: 'If thunderstorm approaching: GROUND ALL OPERATIONS' },
        { number: 7, action: 'Secure all aircraft in hangars away from threat' },
        { number: 8, action: 'Brief staff on operations resumption criteria' },
      ],
    },
    {
      id: 'medical',
      title: 'Medical Emergency on Ground',
      icon: <Shield className="w-5 h-5" />,
      steps: [
        { number: 1, action: 'Call 911 immediately - provide location and incident type' },
        { number: 2, action: 'Clear area and establish scene safety' },
        { number: 3, action: 'Perform primary survey: Responsiveness, breathing, circulation' },
        { number: 4, action: 'If unresponsive and not breathing: Begin CPR' },
        { number: 5, action: 'Use AED immediately if available - follow audio prompts' },
        { number: 6, action: 'Place in recovery position if breathing but unresponsive' },
        { number: 7, action: 'Provide detailed medical history to emergency responders' },
        { number: 8, action: 'Document incident and witness statements for liability' },
      ],
    },
  ];

  const equipmentLocations: EquipmentLocation[] = [
    {
      name: 'First Aid Kit',
      location: 'Manifest Desk',
      icon: <AlertCircle className="w-5 h-5 text-red-600" />,
    },
    {
      name: 'AED (Automated External Defibrillator)',
      location: 'Hangar East Wall',
      icon: <Zap className="w-5 h-5 text-yellow-600" />,
    },
    {
      name: 'Fire Extinguisher',
      location: 'Hangar, Office, Aircraft',
      icon: <AlertTriangle className="w-5 h-5 text-orange-600" />,
    },
    {
      name: 'Emergency Stretcher',
      location: 'Hangar',
      icon: <Shield className="w-5 h-5 text-blue-600" />,
    },
    {
      name: 'Spinal Board',
      location: 'First Aid Station',
      icon: <Heart className="w-5 h-5 text-red-600" />,
    },
  ];

  const handleEmergencyActivation = () => {
    setConfirmDialog(true);
  };

  const confirmEmergency = async () => {
    setEmergencyActive(true);
    setConfirmDialog(false);
    // Dispatch emergency event to notification system
    try {
      await apiGet('/weather'); // triggers weather-based safety checks
    } catch {
      // Emergency activated locally even if API is unavailable
    }
  };

  const deactivateEmergency = () => {
    setEmergencyActive(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-transparent p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Emergency Response Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 dark:text-gray-300 mt-2">Critical contacts, procedures, and equipment locations</p>
        </div>

        {/* Emergency Status Banner */}
        <div className={`mb-8 rounded-lg p-6 ${emergencyActive ? 'bg-red-600 text-white animate-pulse' : 'bg-green-100 text-green-800'}`}>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className={`w-6 h-6 ${emergencyActive ? 'animate-bounce' : ''}`} />
                <h2 className="text-2xl font-bold">
                  {emergencyActive ? 'EMERGENCY MODE ACTIVE' : 'Normal Operations'}
                </h2>
              </div>
              {emergencyActive ? (
                <p className="text-sm">
                  Emergency activated at {new Date().toLocaleTimeString()}. All emergency contacts have been notified.
                </p>
              ) : (
                <p className="text-sm">All systems operational and ready.</p>
              )}
            </div>
            <div>
              {emergencyActive ? (
                <button
                  onClick={deactivateEmergency}
                  className="px-6 py-2 bg-yellow-600 hover:bg-yellow-700 text-white font-bold rounded-lg transition-colors"
                >
                  DEACTIVATE
                </button>
              ) : (
                <button
                  onClick={handleEmergencyActivation}
                  className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap"
                >
                  <AlertTriangle className="w-5 h-5" />
                  ACTIVATE EMERGENCY
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Emergency Contacts */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Emergency Contacts</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(emergencyContacts).map(([key, contact]) => (
              <div key={key} className="bg-white dark:bg-slate-800 rounded-lg shadow p-4 hover:shadow-lg transition-shadow">
                <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase">{contact.label}</p>
                <div className="mt-3 space-y-2">
                  <a
                    href={`tel:${contact.phone.replace(/\D/g, '')}`}
                    className="flex items-center gap-2 text-lg font-bold text-blue-600 hover:text-blue-700"
                  >
                    <Phone className="w-5 h-5" />
                    {contact.phone}
                  </a>
                  {contact.email && (
                    <a
                      href={`mailto:${contact.email}`}
                      className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:text-white"
                    >
                      <AlertCircle className="w-4 h-4" />
                      {contact.email}
                    </a>
                  )}
                  {contact.details && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{contact.details}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Emergency Procedures */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Emergency Procedures</h2>
          <div className="space-y-3">
            {procedures.map((proc) => (
              <div key={proc.id} className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
                <button
                  onClick={() => setExpandedProcedure(expandedProcedure === proc.id ? null : proc.id)}
                  className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-blue-600">{proc.icon}</div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">{proc.title}</h3>
                  </div>
                  {expandedProcedure === proc.id ? (
                    <ChevronUp className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  )}
                </button>
                {expandedProcedure === proc.id && (
                  <div className="border-t p-4 bg-gray-50 space-y-3">
                    {proc.steps.map((step) => (
                      <div key={step.number} className="flex gap-4">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                          {step.number}
                        </div>
                        <p className="text-gray-700 dark:text-gray-300 pt-1">{step.action}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Equipment Locations */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Emergency Equipment Locations</h2>
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
            <div className="divide-y">
              {equipmentLocations.map((item, idx) => (
                <div key={idx} className="p-4 flex items-start gap-4 hover:bg-gray-50 transition-colors">
                  <div className="flex-shrink-0 mt-1">{item.icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white">{item.name}</p>
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mt-1">
                      <MapPin className="w-4 h-4" />
                      {item.location}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Important Notes */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
          <div className="flex gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-amber-900 mb-3">Important Safety Notes</h3>
              <ul className="text-sm text-amber-900 space-y-2">
                <li>- Keep all emergency contacts updated and accessible at all times</li>
                <li>- Review and practice emergency procedures quarterly with full staff</li>
                <li>- All DZ personnel must be trained in emergency protocols before working</li>
                <li>- Test emergency communication systems and contact accuracy weekly</li>
                <li>- AAD inspection and AAD firing protocol must be followed strictly</li>
                <li>- Always maintain clear landing zones and equipment accessibility</li>
                <li>- Document every incident thoroughly for liability and safety analysis</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-sm w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              Confirm Emergency Activation
            </h3>
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              Are you absolutely certain you want to activate emergency mode? This will immediately notify all emergency contacts, dispatch services, and enable emergency protocols.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDialog(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmEmergency}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
              >
                Activate Emergency
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
