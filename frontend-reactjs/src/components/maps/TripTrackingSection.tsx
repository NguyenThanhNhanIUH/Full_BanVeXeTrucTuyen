import TripTrackingMap from './TripTrackingMap';

type TripTrackingSectionProps = {
  tripId: number;
  className?: string;
};

const TripTrackingSection = ({ tripId, className = '' }: TripTrackingSectionProps) => (
  <div className={`rounded-2xl border border-gray-200 bg-gray-50/80 p-4 ${className}`.trim()}>
    <p className="text-sm font-bold text-gray-900">Theo dõi xe trên bản đồ</p>
    <div className="mt-3">
      <TripTrackingMap tripId={tripId} active />
    </div>
  </div>
);

export default TripTrackingSection;
