import * as XLSX from 'xlsx';

export interface AttendanceExportItem {
  stt: number;
  empCode: string;
  empName: string;
  department: string;
  projectCode: string;
  projectName: string;
  shiftName: string;
  date: string;
  checkIn: string;
  checkOut: string;
  workedHours: number;
  otHours: number;
  statusText: string;
  workUnits: number;
  gpsStatus: string;
  distanceMeters: string;
  coords: string;
  notes: string;
}

export interface MonthlyExportItem {
  stt: number;
  empCode: string;
  empName: string;
  department: string;
  projectCode: string;
  standardDays: number;
  totalWorkUnits: number;
  totalWorkedHours: number;
  totalOtHours: number;
  presentCount: number;
  lateCount: number;
  halfDayCount: number;
  leaveCount: number;
  absentCount: number;
}

/**
 * Xuất file Excel Bảng Chấm Công Theo Ngày
 */
export function exportDailyAttendanceToExcel(
  selectedDate: string,
  items: AttendanceExportItem[],
  companyName: string = 'BPOTIME - HỆ THỐNG QUẢN LÝ CHẤM CÔNG HIỆN TRƯỜNG'
) {
  const wb = XLSX.utils.book_new();

  // Header dòng giới thiệu
  const headerData = [
    [companyName.toUpperCase()],
    [`BẢNG ĐIỂM DANH & CHẤM CÔNG NGÀY: ${selectedDate}`],
    [`Thời gian xuất báo cáo: ${new Date().toLocaleString('vi-VN')} | Tổng số nhân sự: ${items.length}`],
    [], // Dòng trống
    [
      'STT',
      'Mã NV',
      'Họ và Tên',
      'Phòng Ban',
      'Dự Án / Chi Nhánh',
      'Ca Làm Việc',
      'Giờ Vào',
      'Giờ Ra',
      'Giờ Làm',
      'Giờ OT',
      'Trạng Thái',
      'Công',
      'Định Vị GPS',
      'Khoảng Cách (m)',
      'Tọa Độ Check-in',
      'Ghi Chú / Lý Do'
    ]
  ];

  // Tính tổng
  let sumHours = 0;
  let sumOt = 0;
  let sumUnits = 0;

  const rowData = items.map((item) => {
    sumHours += item.workedHours || 0;
    sumOt += item.otHours || 0;
    sumUnits += item.workUnits || 0;

    return [
      item.stt,
      item.empCode,
      item.empName,
      item.department,
      `${item.projectCode} - ${item.projectName}`,
      item.shiftName,
      item.checkIn || '--:--',
      item.checkOut || '--:--',
      item.workedHours,
      item.otHours,
      item.statusText,
      item.workUnits,
      item.gpsStatus,
      item.distanceMeters,
      item.coords,
      item.notes
    ];
  });

  // Dòng tổng cộng
  const summaryRow = [
    'TỔNG CỘNG',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    Math.round(sumHours * 10) / 10,
    Math.round(sumOt * 10) / 10,
    '',
    Math.round(sumUnits * 10) / 10,
    '',
    '',
    '',
    ''
  ];

  const allRows = [...headerData, ...rowData, summaryRow];
  const ws = XLSX.utils.aoa_to_sheet(allRows);

  // Căn chỉnh độ rộng cột
  ws['!cols'] = [
    { wch: 6 },  // STT
    { wch: 12 }, // Mã NV
    { wch: 24 }, // Họ tên
    { wch: 18 }, // Phòng ban
    { wch: 26 }, // Dự án
    { wch: 18 }, // Ca
    { wch: 10 }, // Giờ vào
    { wch: 10 }, // Giờ ra
    { wch: 10 }, // Giờ làm
    { wch: 10 }, // Giờ OT
    { wch: 16 }, // Trạng thái
    { wch: 8 },  // Công
    { wch: 18 }, // GPS
    { wch: 16 }, // Khoảng cách
    { wch: 24 }, // Tọa độ
    { wch: 32 }  // Ghi chú
  ];

  // Merge tiêu đề trên cùng
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 15 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 15 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 15 } },
    { s: { r: allRows.length - 1, c: 0 }, e: { r: allRows.length - 1, c: 7 } }
  ];

  XLSX.utils.book_append_sheet(wb, ws, `Bảng Công ${selectedDate}`);
  const fileName = `Bang_Cham_Cong_${selectedDate.replace(/-/g, '')}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * Xuất file Excel Bảng Chấm Công Tổng Hợp Theo Tháng
 */
export function exportMonthlyAttendanceToExcel(
  monthStr: string, // YYYY-MM
  summaryItems: MonthlyExportItem[],
  detailItems?: AttendanceExportItem[],
  companyName: string = 'BPOTIME - HỆ THỐNG QUẢN LÝ CHẤM CÔNG HIỆN TRƯỜNG'
) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Bảng tổng hợp công tháng
  const summaryHeader = [
    [companyName.toUpperCase()],
    [`BẢNG TỔNG HỢP CÔNG & CHUYÊN CẦN THÁNG: ${monthStr}`],
    [`Thời gian xuất: ${new Date().toLocaleString('vi-VN')} | Tổng số nhân sự: ${summaryItems.length}`],
    [],
    [
      'STT',
      'Mã NV',
      'Họ và Tên',
      'Phòng Ban',
      'Dự Án',
      'Công Chuẩn',
      'Công Thực Tế',
      'Tổng Giờ Làm',
      'Tổng Giờ OT',
      'Số Ngày Có Mặt',
      'Số Lần Đi Muộn',
      'Nửa Ngày',
      'Nghỉ Phép (P)',
      'Vắng Mặt (KP)'
    ]
  ];

  let sumTotalUnits = 0;
  let sumTotalHours = 0;
  let sumTotalOt = 0;

  const summaryRows = summaryItems.map((item) => {
    sumTotalUnits += item.totalWorkUnits;
    sumTotalHours += item.totalWorkedHours;
    sumTotalOt += item.totalOtHours;

    return [
      item.stt,
      item.empCode,
      item.empName,
      item.department,
      item.projectCode,
      item.standardDays,
      Math.round(item.totalWorkUnits * 10) / 10,
      Math.round(item.totalWorkedHours * 10) / 10,
      Math.round(item.totalOtHours * 10) / 10,
      item.presentCount,
      item.lateCount,
      item.halfDayCount,
      item.leaveCount,
      item.absentCount
    ];
  });

  const totalSummaryRow = [
    'TỔNG CỘNG TOÀN CÔNG TY',
    '',
    '',
    '',
    '',
    '',
    Math.round(sumTotalUnits * 10) / 10,
    Math.round(sumTotalHours * 10) / 10,
    Math.round(sumTotalOt * 10) / 10,
    '',
    '',
    '',
    '',
    ''
  ];

  const allSummaryRows = [...summaryHeader, ...summaryRows, totalSummaryRow];
  const wsSummary = XLSX.utils.aoa_to_sheet(allSummaryRows);

  wsSummary['!cols'] = [
    { wch: 6 },  // STT
    { wch: 12 }, // Mã NV
    { wch: 24 }, // Họ tên
    { wch: 18 }, // Phòng ban
    { wch: 14 }, // Dự án
    { wch: 12 }, // Công chuẩn
    { wch: 14 }, // Công thực tế
    { wch: 14 }, // Giờ làm
    { wch: 12 }, // Giờ OT
    { wch: 16 }, // Có mặt
    { wch: 14 }, // Đi muộn
    { wch: 12 }, // Nửa ngày
    { wch: 14 }, // Phép
    { wch: 14 }  // Vắng
  ];

  wsSummary['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 13 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 13 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 13 } },
    { s: { r: allSummaryRows.length - 1, c: 0 }, e: { r: allSummaryRows.length - 1, c: 5 } }
  ];

  XLSX.utils.book_append_sheet(wb, wsSummary, 'Tổng Hợp Tháng');

  // Sheet 2: Chi tiết từng ngày trong tháng (nếu có)
  if (detailItems && detailItems.length > 0) {
    const detailHeader = [
      [`CHI TIẾT LƯỢT CHẤM CÔNG THÁNG: ${monthStr}`],
      [],
      [
        'STT',
        'Ngày',
        'Mã NV',
        'Họ và Tên',
        'Phòng Ban',
        'Dự Án',
        'Ca Làm',
        'Giờ Vào',
        'Giờ Ra',
        'Giờ Làm',
        'Giờ OT',
        'Trạng Thái',
        'Công',
        'Khoảng Cách (m)',
        'Ghi Chú / Lý Do'
      ]
    ];

    const detailRows = detailItems.map((d) => [
      d.stt,
      d.date,
      d.empCode,
      d.empName,
      d.department,
      d.projectCode,
      d.shiftName,
      d.checkIn || '--:--',
      d.checkOut || '--:--',
      d.workedHours,
      d.otHours,
      d.statusText,
      d.workUnits,
      d.distanceMeters,
      d.notes
    ]);

    const allDetailRows = [...detailHeader, ...detailRows];
    const wsDetail = XLSX.utils.aoa_to_sheet(allDetailRows);

    wsDetail['!cols'] = [
      { wch: 6 },
      { wch: 12 },
      { wch: 12 },
      { wch: 22 },
      { wch: 16 },
      { wch: 12 },
      { wch: 16 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 14 },
      { wch: 8 },
      { wch: 16 },
      { wch: 30 }
    ];

    XLSX.utils.book_append_sheet(wb, wsDetail, 'Chi Tiết Chấm Công');
  }

  const fileName = `Bang_Tong_Hop_Cong_${monthStr.replace(/-/g, '_')}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
