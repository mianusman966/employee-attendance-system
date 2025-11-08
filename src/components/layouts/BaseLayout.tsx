'use client';

import { Fragment, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Disclosure, Menu, Transition } from '@headlessui/react';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useAuth } from '../../hooks/useAuth';
import dynamic from 'next/dynamic';

const AddUserModal = dynamic(() => import('../dashboard/AddUserModal'), { ssr: false });
const AIChatbot = dynamic(() => import('../dashboard/AIChatbot'), { ssr: false });

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export default function BaseLayout({ children }: { children: React.ReactNode }) {
  const { profile, signOut } = useAuth();
  const pathname = usePathname();
  const [isChatOpen, setIsChatOpen] = useState(false);

  const navigation = [
    ...(profile?.role === 'admin'
      ? [
          { name: 'Dashboard', href: '/dashboard' },
          { name: 'Employees', href: '/dashboard/employees' },
          { name: 'Departments', href: '/dashboard/departments' },
          { name: 'Attendance', href: '/attendance' },
          { name: 'Manual Attendance', href: '/attendance/manual' },
          { name: 'Reports', href: '/dashboard/reports' },
          { name: 'System', href: '/dashboard/system' },
        ]
      : [{ name: 'Attendance', href: '/attendance' }]),
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <Disclosure as="nav" className="bg-white shadow-sm">
        {({ open }) => (
          <>
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="flex h-16 justify-between">
                <div className="flex">
                  <div className="flex flex-shrink-0 items-center">
                    <span className="text-xl font-bold text-gray-900">EmpAttend</span>
                  </div>
                  <div className="hidden sm:-my-px sm:ml-6 sm:flex sm:space-x-8">
                    {navigation.map((item) => (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={classNames(
                          pathname === item.href
                            ? 'border-blue-500 text-gray-900'
                            : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
                          'inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium'
                        )}
                      >
                        {item.name}
                      </Link>
                    ))}
                  </div>
                </div>
                <div className="hidden sm:ml-6 sm:flex sm:items-center">
                  {profile?.role === 'admin' && (
                    <>
                      <button
                        onClick={() => setIsChatOpen(true)}
                        className="mr-4 inline-flex items-center rounded-md bg-gradient-to-r from-purple-600 to-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:from-purple-700 hover:to-blue-700 transition-all"
                        title="AI Assistant"
                      >
                        <svg className="w-5 h-5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        AI Assistant
                      </button>
                      <button
                        onClick={() => (document.getElementById('add-user-modal') as HTMLDialogElement)?.showModal()}
                        className="mr-4 inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                      >
                        Add User
                      </button>
                    </>
                  )}
                  <Menu as="div" className="relative ml-3">
                    <div>
                      <Menu.Button className="flex rounded-full bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                        <span className="sr-only">Open user menu</span>
                        <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-600">
                            {profile?.full_name?.[0] ?? 'U'}
                          </span>
                        </div>
                      </Menu.Button>
                    </div>
                    <Transition
                      as={Fragment}
                      enter="transition ease-out duration-200"
                      enterFrom="transform opacity-0 scale-95"
                      enterTo="transform opacity-100 scale-100"
                      leave="transition ease-in duration-75"
                      leaveFrom="transform opacity-100 scale-100"
                      leaveTo="transform opacity-0 scale-95"
                    >
                      <Menu.Items className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                        <Menu.Item>
                          {({ active }) => (
                            <button
                              onClick={() => signOut()}
                              className={classNames(
                                active ? 'bg-red-50' : '',
                                'block w-full px-4 py-2 text-left text-sm text-red-600 font-medium hover:bg-red-50'
                              )}
                            >
                              Sign out
                            </button>
                          )}
                        </Menu.Item>
                      </Menu.Items>
                    </Transition>
                  </Menu>
                </div>
                <div className="-mr-2 flex items-center sm:hidden">
                  <Disclosure.Button className="inline-flex items-center justify-center rounded-md bg-white p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                    <span className="sr-only">Open main menu</span>
                    {open ? (
                      <XMarkIcon className="block h-6 w-6" aria-hidden="true" />
                    ) : (
                      <Bars3Icon className="block h-6 w-6" aria-hidden="true" />
                    )}
                  </Disclosure.Button>
                </div>
              </div>
            </div>

            <Disclosure.Panel className="sm:hidden">
              <div className="space-y-1 pb-3 pt-2">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={classNames(
                      pathname === item.href
                        ? 'bg-blue-50 border-blue-500 text-blue-700'
                        : 'border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800',
                      'block border-l-4 py-2 pl-3 pr-4 text-base font-medium'
                    )}
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
              <div className="border-t border-gray-200 pb-3 pt-4">
                <div className="flex items-center px-4">
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-600">
                        {profile?.full_name?.[0] ?? 'U'}
                      </span>
                    </div>
                  </div>
                  <div className="ml-3">
                    <div className="text-base font-medium text-gray-800">
                      {profile?.full_name || 'User'}
                    </div>
                    <div className="text-sm font-medium text-gray-500">
                      {profile?.email}
                    </div>
                  </div>
                </div>
                <div className="mt-3 space-y-1">
                  {profile?.role === 'admin' && (
                    <button
                      onClick={() => (document.getElementById('add-user-modal') as HTMLDialogElement)?.showModal()}
                      className="block w-full px-4 py-2 text-left text-base font-medium text-blue-600 hover:bg-gray-100 hover:text-blue-800"
                    >
                      Add User
                    </button>
                  )}
                  <button
                    onClick={() => signOut()}
                    className="block w-full px-4 py-2 text-left text-base font-medium text-red-600 hover:bg-gray-100 hover:text-red-800"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            </Disclosure.Panel>
          </>
        )}
      </Disclosure>

      <div className="py-10">
        <main className="mx-auto max-w-7xl sm:px-6 lg:px-8">{children}</main>
      </div>

      {/* Role badge bottom-right - Shows current user role */}
      {profile?.role && (
        <div className="fixed bottom-4 right-4 z-40">
          <span className="rounded-full bg-gray-900/90 text-white px-3 py-1.5 text-sm font-medium shadow-lg uppercase">
            {profile.role}
          </span>
        </div>
      )}

      {/* Add User Modal portal */}
      {profile?.role === 'admin' && <AddUserModal />}
      
      {/* AI Assistant (Admin only) */}
      {profile?.role === 'admin' && (
        <AIChatbot 
          isOpen={isChatOpen} 
          onClose={() => setIsChatOpen(false)} 
          userName={profile?.full_name || 'Admin'} 
        />
      )}
    </div>
  );
}