const { app, BrowserWindow, ipcMain } = require("electron");
const Store = require("electron-store");
const path = require("path");
const dayjs = require("dayjs");
const weekday = require("dayjs/plugin/weekday");
const localizedFormat = require("dayjs/plugin/localizedFormat");
const localeData = require("dayjs/plugin/localeData");
const vi = require("dayjs/locale/vi");

// Cấu hình dayjs
dayjs.extend(weekday);
dayjs.extend(localizedFormat);
dayjs.extend(localeData);
dayjs.locale(vi);

// Khởi tạo store
const store = new Store();

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: true,
      contextIsolation: false,
    },
    title: "Quản lý lớp học",
    autoHideMenuBar: true,
    icon: path.join(__dirname, "assets", "icon.png"),
  });

  win.maximize();

  win.loadFile(path.join(__dirname, "renderer", "index.html"));

  // Chỉ mở DevTools trong môi trường development
  if (process.env.NODE_ENV === "development") {
    win.webContents.openDevTools();
  }
}

const checkAndRotateMonths = () => {
  const classes = store.get("classes", []);
  const date = new Date();
  const currentMonth = date.getMonth();

  classes.forEach((cls) => {
    // Kiểm tra nếu đã sang tháng mới
    if (cls.monthTag !== currentMonth) {
      // Đẩy dữ liệu cũ xuống các tháng trước
      cls.month = {
        monthCurrent: initNewMonth(currentMonth, cls.month.monthCurrent), // Khởi tạo tháng mới
        oneMonthAgo: cls.month.monthCurrent || {}, // Đẩy tháng hiện tại xuống thành 1 tháng trước
        twoMonthAgo: cls.month.oneMonthAgo || {},
        threeMonthAgo: cls.month.twoMonthAgo || {},
        fourMonthAgo: cls.month.threeMonthAgo || {},
        fiveMonthAgo: cls.month.fourMonthAgo || {},
        // Giữ tối đa 5 tháng
      };
    }
  });

  store.set("classes", classes);
};

// Hàm khởi tạo tháng mới
const initNewMonth = (monthTag, monthCurrent) => ({
  monthTag, // Đánh dấu YYYY-MM để kiểm tra
  students: monthCurrent?.students?.map((s) => ({
    name: s.name,
    mobile: s.mobile || "",
    totalMoney: 0, // Reset tổng tiền
    notes: [], // Reset ghi chú
    attendances: [], // Reset điểm danh
  })),
  notes: [],
  moneyPerLesson: monthCurrent?.moneyPerLesson || 0, // Giữ nguyên tiền mỗi buổi học
});

app.whenReady().then(() => {
  checkAndRotateMonths(); // Kiểm tra ngay khi khởi động
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// IPC Handlers
ipcMain.handle("add-class", (event, className, moneyPerLesson) => {
  const classes = store.get("classes", []);

  // Kiểm tra lớp đã tồn tại chưa
  if (classes.some((c) => c.name === className)) {
    throw new Error("Lớp học đã tồn tại");
  }

  const today = new Date();

  classes.push({
    name: className,
    monthTag: today.getMonth(),
    month: {
      monthCurrent: {
        students: [],
        notes: [],
        moneyPerLesson: Number(moneyPerLesson),
      },
      oneMonthAgo: { students: [], notes: [] },
      twoMonthAgo: { students: [], notes: [] },
      threeMonthAgo: { students: [], notes: [] },
      fourMonthAgo: { students: [], notes: [] },
      fiveMonthAgo: { students: [], notes: [] },
    },
  });
  store.set("classes", classes);
});

ipcMain.handle("get-classes", () => {
  return store.get("classes", []);
});

ipcMain.handle("get-class", (event, className) => {
  const classes = store.get("classes", []);
  return classes.find((cls) => cls.name === className);
});

ipcMain.handle("update-class", (event, className, newName, newMoney) => {
  const classes = store.get("classes", []);
  const clsIndex = classes.findIndex((c) => c.name === className);

  if (clsIndex !== -1) {
    // Kiểm tra tên mới không trùng với lớp khác
    if (newName !== className && classes.some((c) => c.name === newName)) {
      throw new Error("Tên lớp đã tồn tại");
    }

    classes[clsIndex].name = newName;
    classes[clsIndex].month.monthCurrent.moneyPerLesson = Number(newMoney);
    store.set("classes", classes);
  }
});

ipcMain.handle("add-student", (event, className, studentName, mobile) => {
  const classes = store.get("classes", []);
  const cls = classes.find((c) => c.name === className);

  if (cls) {
    // Kiểm tra học sinh đã tồn tại chưa
    if (cls.month.monthCurrent.students.some((s) => s.name === studentName)) {
      throw new Error("Học sinh đã tồn tại trong lớp");
    }

    cls.month.monthCurrent.students.push({
      name: studentName,
      mobile: mobile || "",
      totalMoney: 0,
      moneyDocument: 0,
      notes: [],
      attendances: [],
    });
    store.set("classes", classes);
  }
});

ipcMain.handle("get-student-detail", (event, className, studentName, month) => {
  const classes = store.get("classes", []);
  const cls = classes.find((c) => c.name === className);
  if (!cls) return null;

  const monthData = cls.month[month] || { students: [] };
  const student = monthData.students?.find((s) => s.name === studentName);
  if (!student) return null;

  const attendances = student.attendances.map((dateStr) => {
    return dayjs(dateStr).format("dddd, DD/MM/YYYY");
  });

  return {
    name: student.name,
    mobile: student.mobile,
    notes: student.notes || [],
    attendances: attendances,
    count: attendances.length,
    totalMoney: student.totalMoney || 0,
  };
});

ipcMain.handle(
  "add-student-note",
  (event, className, studentName, note, month) => {
    const classes = store.get("classes", []);
    const cls = classes.find((c) => c.name === className);
    if (!cls) throw new Error("Lớp học không tồn tại");

    const student = cls.month[month].students.find(
      (s) => s.name === studentName
    );
    if (!student) throw new Error("Học sinh không tồn tại");

    student.notes.push(note);
    store.set("classes", classes);
  }
);

ipcMain.handle(
  "delete-student-note",
  (event, className, studentName, note, month) => {
    const classes = store.get("classes", []);
    const cls = classes.find((c) => c.name === className);
    if (!cls) return;

    const student = cls.month[month].students.find(
      (s) => s.name === studentName
    );
    if (!student) return;

    student.notes = student.notes.filter((n) => n !== note);
    store.set("classes", classes);
  }
);

ipcMain.handle(
  "update-student-field",
  (event, className, studentName, field, value, month) => {
    const classes = store.get("classes", []);
    const cls = classes.find((c) => c.name === className);
    if (!cls) throw new Error("Lớp học không tồn tại");

    const student = cls.month[month].students.find(
      (s) => s.name === studentName
    );
    if (!student) throw new Error("Học sinh không tồn tại");

    student[field] = value;
    store.set("classes", classes);
  }
);

ipcMain.handle("delete-student", (event, className, studentName, month) => {
  const classes = store.get("classes", []);
  const cls = classes.find((c) => c.name === className);
  if (!cls) return;
  cls.month.monthCurrent.students = cls.month.monthCurrent.students.filter(
    (s) => s.name !== studentName
  );
  store.set("classes", classes);
});

ipcMain.handle("add-note", (event, className, note, month) => {
  const classes = store.get("classes", []);
  const cls = classes.find((c) => c.name === className);
  if (!cls) throw new Error("Lớp học không tồn tại");

  if (!cls.month[month]) {
    cls.month[month] = { notes: [], students: [] };
  }

  cls.month[month].notes.push(note);
  store.set("classes", classes);
});

ipcMain.handle("delete-note", (event, className, note, month) => {
  const classes = store.get("classes", []);
  const cls = classes.find((c) => c.name === className);
  if (!cls) return;

  if (cls.month[month]) {
    cls.month[month].notes = cls.month[month].notes.filter((n) => n !== note);
    store.set("classes", classes);
  }
});

ipcMain.handle(
  "update-student-attendance",
  async (event, className, studentName, action, date, month) => {
    const classes = store.get("classes", []);
    const cls = classes.find((c) => c.name === className);
    if (!cls) throw new Error("Lớp học không tồn tại");

    const monthData = cls.month[month] || { students: [] };
    const student = monthData.students?.find((s) => s.name === studentName);
    if (!student) throw new Error("Học sinh không tồn tại");

    if (!student.attendances) {
      student.attendances = [];
    }

    if (action === "add") {
      // Thêm ngày điểm danh
      if (!student.attendances.includes(date)) {
        student.attendances.push(date);
        student.attendances.sort(); // Sắp xếp theo thứ tự thời gian

        // Cập nhật tổng tiền nếu là tháng hiện tại
        student.totalMoney =
          (student.totalMoney || 0) + cls.month.monthCurrent.moneyPerLesson;
      }
    } else if (action === "remove") {
      // Xóa ngày điểm danh
      const index = student.attendances.indexOf(date);
      if (index !== -1) {
        student.attendances.splice(index, 1);

        // Cập nhật tổng tiền nếu là tháng hiện tại
        student.totalMoney = Math.max(
          0,
          (student.totalMoney || 0) - cls.month.monthCurrent.moneyPerLesson
        );
      }
    }

    store.set("classes", classes);
    return { success: true };
  }
);

ipcMain.handle(
  "mark-attendance",
  (event, className, studentName, isChecked) => {
    const classes = store.get("classes", []);
    const cls = classes.find((c) => c.name === className);
    if (!cls) return;

    const student = cls.month.monthCurrent.students.find(
      (s) => s.name === studentName
    );
    if (!student) return;

    const today = dayjs().format("YYYY-MM-DD");
    const attendanceIndex = student.attendances.indexOf(today);

    if (isChecked && attendanceIndex === -1) {
      student.attendances.push(today);
      student.totalMoney += cls.month.monthCurrent.moneyPerLesson;
    } else if (!isChecked && attendanceIndex !== -1) {
      student.attendances.splice(attendanceIndex, 1);
      student.totalMoney -= cls.month.monthCurrent.moneyPerLesson;
    }

    store.set("classes", classes);
  }
);
