import React, { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { ArrowRightLeft, ClipboardCheck, Package, LogOut, QrCode } from 'lucide-react';
import StockEntry from '@/components/admin/StockEntry';
import StockView from '@/components/employee/StockView';
import ShiftClose from '@/components/employee/ShiftClose';
import EmployeeDataSync from '@/components/employee/EmployeeDataSync';
import { isMobileDevice } from '@/lib/platform';

const BASE_NAV = [
  { label: 'Stock Disponible', icon:
