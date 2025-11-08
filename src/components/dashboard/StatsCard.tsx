import { ArrowDownIcon, ArrowUpIcon, UsersIcon, UserGroupIcon, ClipboardDocumentListIcon, ChartBarIcon } from '@heroicons/react/20/solid';

interface Stat {
  name: string;
  value: string | number;
  change?: number;
  changeType?: 'increase' | 'decrease';
}

interface StatsCardProps {
  stats: Stat[];
}

export function StatsCard({ stats }: StatsCardProps) {
  const icons = [
    UsersIcon,
    UserGroupIcon,
    ClipboardDocumentListIcon,
    ChartBarIcon,
  ];
  return (
    <div>
      <dl className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((item, idx) => {
          const Icon = icons[idx % icons.length];
          return (
            <div
              key={item.name}
              className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white to-blue-50 ring-1 ring-gray-200 px-5 pb-12 pt-5 shadow-sm hover:shadow-md transition-shadow sm:px-6 sm:pt-6"
            >
              <dt className="flex items-center justify-between">
                <p className="truncate text-sm font-medium text-gray-600">{item.name}</p>
                <span className="rounded-lg bg-blue-100 p-2 text-blue-600">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
              </dt>
              <dd className="flex items-baseline pb-6 sm:pb-7">
                <p className="text-3xl font-semibold text-gray-900">{item.value}</p>
                {item.change && (
                  <p
                    className={classNames(
                      item.changeType === 'increase' ? 'text-green-600' : 'text-red-600',
                      'ml-2 flex items-baseline text-sm font-semibold'
                    )}
                  >
                    {item.changeType === 'increase' ? (
                      <ArrowUpIcon className="h-5 w-5 flex-shrink-0 self-center text-green-500" aria-hidden="true" />
                    ) : (
                      <ArrowDownIcon className="h-5 w-5 flex-shrink-0 self-center text-red-500" aria-hidden="true" />
                    )}
                    <span className="sr-only">{item.changeType === 'increase' ? 'Increased' : 'Decreased'} by</span>
                    {item.change}%
                  </p>
                )}
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}