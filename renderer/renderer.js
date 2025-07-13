const { ipcRenderer } = require("electron");
const dayjs = require("dayjs");

// DOM Elements
const elements = {
  btnAdd: document.getElementById("btn-add-class"),
  form: document.getElementById("class-form"),
  input: document.getElementById("class-name-input"),
  moneyPerLesson: document.getElementById("money-per-lesson-input"),
  btnSave: document.getElementById("save-class-btn"),
  btnCancel: document.getElementById("cancel-class-btn"),
  container: document.getElementById("class-list"),
  loadingOverlay: document.getElementById("loading-overlay"),
};

let currentView = "home";

// Helper functions
const showLoading = (show) => {
  elements.loadingOverlay.style.display = show ? "flex" : "none";
};

const toggleElement = (element, show) => {
  element.style.display = show ? "block" : "none";
};

const clearInput = (inputElement) => {
  inputElement.value = "";
};

const showError = (message, parentElement = elements.container) => {
  const errorEl = document.createElement("div");
  errorEl.className =
    "bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded";
  errorEl.innerHTML = `<p class="font-medium"><i class="fas fa-exclamation-circle mr-2"></i>${message}</p>`;
  parentElement.prepend(errorEl);
  setTimeout(() => errorEl.remove(), 5000);
  return errorEl;
};

const showSuccess = (message) => {
  const successEl = document.createElement("div");
  successEl.className =
    "bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-4 rounded";
  successEl.innerHTML = `<p class="font-medium"><i class="fas fa-check-circle mr-2"></i>${message}</p>`;
  elements.container.prepend(successEl);
  setTimeout(() => successEl.remove(), 5000);
};

// Event handlers
const handleAddClassClick = () => {
  toggleElement(elements.form, true);
  elements.input.focus();
  toggleElement(elements.btnAdd, false);
};

const handleCancelClassClick = () => {
  toggleElement(elements.form, false);
  clearInput(elements.input);
  clearInput(elements.moneyPerLesson);
  toggleElement(elements.btnAdd, true);
};

const handleSaveClassClick = async () => {
  const name = elements.input.value.trim();
  const money = elements.moneyPerLesson.value.trim();

  if (!name || !money) {
    showError("Vui lòng điền đầy đủ thông tin");
    return;
  }

  try {
    await ipcRenderer.invoke("add-class", name, money);
    clearInput(elements.input);
    clearInput(elements.moneyPerLesson);
    toggleElement(elements.form, false);
    showSuccess("Đã thêm lớp học mới thành công!");
    loadClasses();
  } catch (error) {
    showError(error.message);
  }
};

const loadAddStudentForm = (className) => {
  elements.container.innerHTML = `
    <div class="bg-white p-6 rounded-xl shadow-lg animate-fade-in">
      <h2 class="text-2xl font-bold text-center text-blue-800 mb-6 pb-2 border-b border-blue-200">
        <i class="fas fa-user-plus mr-2"></i>
        Thêm học sinh vào lớp ${className}
      </h2>
      <div class="flex flex-col items-center gap-4 max-w-md mx-auto">
        <div class="w-full">
          <label class="block text-sm font-medium text-gray-700 mb-1">Tên học sinh *</label>
          <input type="text" id="new-student-name" placeholder="Nhập tên học sinh" 
                class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all">
        </div>
        <div class="w-full">
          <label class="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
          <input type="text" id="new-student-mobile" placeholder="Nhập số điện thoại (tuỳ chọn)" 
                class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all">
        </div>
        <div class="flex gap-4 mt-4">
          <button id="btn-add-student" class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-300 flex items-center gap-2">
            <i class="fas fa-save"></i>
            Lưu học sinh
          </button>
          <button id="btn-back-to-class" class="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-300 flex items-center gap-2">
            <i class="fas fa-arrow-left"></i>
            Quay lại
          </button>
        </div>
      </div>
    </div>
  `;

  document.getElementById("btn-back-to-class").onclick = () =>
    loadClassDetail(className);

  document.getElementById("btn-add-student").onclick = async () => {
    const studentName = document
      .getElementById("new-student-name")
      .value.trim();
    const studentMobile = document
      .getElementById("new-student-mobile")
      .value.trim();

    if (!studentName) {
      showError(
        "Vui lòng nhập tên học sinh",
        document.getElementById("new-student-name").parentElement
      );
      return;
    }

    try {
      await ipcRenderer.invoke(
        "add-student",
        className,
        studentName,
        studentMobile
      );
      showSuccess("Đã thêm học sinh thành công!");
      loadClassDetail(className);
    } catch (error) {
      showError(
        error.message,
        document.getElementById("new-student-name").parentElement
      );
    }
  };
};

// Class list functions
const renderClassList = (classList) => {
  const divClass = document.createElement("div");
  divClass.className =
    "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-6";

  if (classList.length === 0) {
    divClass.innerHTML = `
      <div class="col-span-full bg-blue-50 p-8 rounded-xl text-center">
        <i class="fas fa-book-open text-4xl text-blue-400 mb-4"></i>
        <p class="text-gray-600 text-lg">Chưa có lớp học nào được tạo.</p>
        <p class="text-gray-500 mt-2">Nhấn nút "Thêm lớp" để bắt đầu</p>
      </div>
    `;
    return divClass;
  }

  classList.forEach((cls) => {
    const div = document.createElement("div");
    div.className =
      "bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 cursor-pointer border-l-4 border-blue-500 hover:border-blue-700";
    div.innerHTML = `
      <div class="flex items-center gap-4">
        <div class="bg-blue-100 p-3 rounded-full">
          <i class="fas fa-chalkboard text-blue-600 text-xl"></i>
        </div>
        <div>
          <h3 class="text-xl font-semibold text-gray-800">${cls.name}</h3>
          <p class="text-gray-600 mt-1">
            <i class="fas fa-users mr-1"></i>
            Số học sinh: <span class="font-medium">${
              cls.month.monthCurrent.students.length
            }</span>
          </p>
          <p class="text-gray-600 mt-1">
            <i class="fas fa-money-bill-wave mr-1"></i>
            Học phí: <span class="font-medium">${cls.month.monthCurrent.moneyPerLesson.toLocaleString()} VNĐ/buổi</span>
          </p>
        </div>
      </div>
    `;
    div.onclick = () => loadClassDetail(cls.name);
    divClass.appendChild(div);
  });

  return divClass;
};

const loadClasses = async () => {
  currentView = "home";
  toggleElement(elements.btnAdd, true);

  try {
    const classList = await ipcRenderer.invoke("get-classes");

    elements.container.innerHTML = `
      <div class="animate-fade-in">
        <div class="flex justify-between items-center p-6 pb-0">
          <h2 class="text-2xl font-bold text-blue-800">
            <i class="fas fa-list-ul mr-2"></i>
            Danh sách lớp học
          </h2>
        </div>
      </div>
    `;

    elements.container.appendChild(renderClassList(classList));
  } catch (error) {
    showError("Lỗi khi tải danh sách lớp học: " + error.message);
  }
};

// Class detail functions
const renderStudentTable = (students, className, month) => {
  if (!students || students.length === 0) {
    return `
      <tr>
        <td colspan="6" class="px-6 py-4 text-center text-gray-500 italic">
          Chưa có học sinh nào trong lớp này
        </td>
      </tr>
    `;
  }

  return students
    .map((s) => {
      const today = dayjs().format("YYYY-MM-DD");
      const isTodayChecked = s.attendances?.includes(today);

      return `
      <tr class="hover:bg-blue-50 transition-colors duration-200">
        <td class="px-6 py-4 border-b border-gray-200">
          <label class="flex items-center justify-start space-x-2">
            ${
              month === "monthCurrent"
                ? `
              <input type="checkbox" class="attendance-checkbox" 
                     data-name="${s.name}" ${isTodayChecked ? "checked" : ""}>
            `
                : ""
            }
            <span class="font-medium text-gray-800">${s.name}</span>
          </label>
        </td>
        <td class="px-6 py-4 border-b border-gray-200 text-center text-gray-600">
          ${
            s.mobile ||
            '<span class="text-gray-400 italic">(chưa cập nhật)</span>'
          }
        </td>
        <td class="px-6 py-4 border-b border-gray-200 text-center text-gray-600">
          ${s.attendances?.length || 0}
        </td>
        <td class="px-6 py-4 border-b border-gray-200 text-center font-medium text-blue-600">
          ${s.totalMoney || 0} VNĐ
        </td>
        <td class="px-6 py-4 border-b border-gray-200 text-center font-medium text-blue-600 editable-money-cell data-class="${className}" 
            data-student="${s.name}" 
            data-field="moneyDocument"">
          ${s.moneyDocument || 0} VNĐ
        </td>
        <td class="px-6 py-4 border-b border-gray-200 text-center font-medium text-blue-600" 
            data-class="${className}" 
            data-student="${s.name}" 
            data-field="totalMoney">
          ${(s.totalMoney + s.moneyDocument || 0).toLocaleString()} VNĐ
        </td>
        <td class="px-6 py-4 border-b border-gray-200">
          ${
            s.notes?.length > 0
              ? `
            <ul class="list-disc pl-5 space-y-1 max-h-20 overflow-y-auto">
              ${s.notes
                .map(
                  (note) => `
                <li class="text-gray-700">${note}</li>
              `
                )
                .join("")}
            </ul>`
              : `
            <span class="text-gray-400 italic">(không có ghi chú)</span>
          `
          }
        </td>
        <td class="px-6 py-4 border-b border-gray-200">
          <div class="flex justify-center space-x-2">
            <button class="view-student-btn px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors duration-200 flex items-center gap-1"
                    data-name="${s.name}">
              <i class="fas fa-eye"></i>
              Chi tiết
            </button>
            <button class="delete-student-btn px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors duration-200 flex items-center gap-1"
                    data-name="${s.name}">
              <i class="fas fa-trash"></i>
              Xóa
            </button>
          </div>
        </td>
      </tr>
    `;
    })
    .join("");
};

const loadClassDetail = async (className) => {
  toggleElement(elements.btnAdd, false);
  currentView = className;

  try {
    const cls = await ipcRenderer.invoke("get-class", className);
    if (!cls) throw new Error("Không tìm thấy lớp học");

    elements.container.innerHTML = `
      <div class="animate-fade-in">
        <!-- Header -->
        <div class="bg-blue-600 text-white p-6">
          <div class="flex justify-between items-center">
            <div>
              <h2 class="text-2xl font-bold flex items-center gap-3">
                <i class="fas fa-chalkboard"></i>
                ${cls.name}
              </h2>
              <p class="mt-1">
                <span class="font-medium">Học phí:</span> 
                ${cls.month.monthCurrent.moneyPerLesson.toLocaleString()} VNĐ/buổi
              </p>
            </div>
            <button id="btn-back" class="px-4 py-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-colors duration-200 flex items-center gap-2">
              <i class="fas fa-arrow-left"></i>
              Trở lại
            </button>
          </div>
        </div>

        <!-- Actions -->
        <div class="bg-white p-6 border-b">
          <div class="flex flex-wrap justify-between gap-4">
            <div class="flex gap-4">
              <button id="btn-open-add-form-student" class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-300 flex items-center gap-2">
                <i class="fas fa-user-plus"></i>
                Thêm học sinh
              </button>
              <button id="btn-open-form-class" class="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-300 flex items-center gap-2">
                <i class="fas fa-edit"></i>
                Sửa thông tin
              </button>
            </div>
            
            <div class="flex items-center gap-2">
              <label for="month-select" class="text-sm font-medium text-gray-700">Xem dữ liệu:</label>
              <select id="month-select" class="border border-gray-300 px-4 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all">
                <option value="monthCurrent">Tháng hiện tại</option>
                <option value="oneMonthAgo">1 tháng trước</option>
                <option value="twoMonthAgo">2 tháng trước</option>
                <option value="threeMonthAgo">3 tháng trước</option>
                <option value="fourMonthAgo">4 tháng trước</option>
                <option value="fiveMonthAgo">5 tháng trước</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Student table -->
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-blue-600 text-white">
              <tr>
                <th class="px-6 py-3 text-center text-sm font-medium uppercase tracking-wider">Điểm danh</th>
                <th class="px-6 py-3 text-center text-sm font-medium uppercase tracking-wider">Số điện thoại</th>
                <th class="px-6 py-3 text-center text-sm font-medium uppercase tracking-wider">Số buổi</th>
                <th class="px-6 py-3 text-center text-sm font-medium uppercase tracking-wider">Tiền học</th>
                <th class="px-6 py-3 text-center text-sm font-medium uppercase tracking-wider">Tiền tài liệu</th>
                <th class="px-6 py-3 text-center text-sm font-medium uppercase tracking-wider">Tổng tiền</th>
                <th class="px-6 py-3 text-center text-sm font-medium uppercase tracking-wider">Ghi chú</th>
                <th class="px-6 py-3 text-center text-sm font-medium uppercase tracking-wider">Thao tác</th>
              </tr>
            </thead>
            <tbody id="student-table-body" class="bg-white divide-y divide-gray-200">
              ${renderStudentTable(
                cls.month.monthCurrent.students,
                className,
                "monthCurrent"
              )}
            </tbody>
          </table>
        </div>

        <!-- Class notes -->
        <div class="bg-white p-6 border-t">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <i class="fas fa-clipboard-list"></i>
              Ghi chú lớp học
            </h3>
            <button id="btn-addnote" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-300 flex items-center gap-2">
              <i class="fas fa-plus"></i>
              Thêm ghi chú
            </button>
          </div>
          
          <ul id="notes" class="space-y-2 max-h-60 overflow-y-auto">
            ${
              cls.month.monthCurrent.notes.length > 0
                ? cls.month.monthCurrent.notes
                    .map(
                      (note) => `
                <li class="flex justify-between items-center bg-blue-50 p-3 rounded-lg">
                  <span class="text-gray-700">${note}</span>
                  <button onclick="handleDeleteNote('${className}','${note}','monthCurrent')" 
                          class="p-1 text-red-600 hover:text-red-800 transition-colors">
                    <i class="fas fa-trash"></i>
                  </button>
                </li>
              `
                    )
                    .join("")
                : `
              <li class="text-center py-4 text-gray-500 italic">Chưa có ghi chú nào</li>
            `
            }
          </ul>
        </div>
      </div>
    `;

    // Setup event listeners
    document.getElementById("btn-back").onclick = loadClasses;

    document.getElementById("btn-open-add-form-student").onclick = () =>
      loadAddStudentForm(className);

    document.getElementById("btn-open-form-class").onclick = () => {
      elements.container.innerHTML = `
        <div class="bg-white p-6 rounded-xl shadow-lg animate-fade-in">
          <h2 class="text-2xl font-bold text-center text-blue-800 mb-6 pb-2 border-b border-blue-200">
            <i class="fas fa-edit mr-2"></i>
            Sửa thông tin lớp ${className}
          </h2>
          <div class="flex flex-col items-center gap-4 max-w-md mx-auto">
            <div class="w-full">
              <label class="block text-sm font-medium text-gray-700 mb-1">Tên lớp học *</label>
              <input type="text" id="edit-class-name" value="${cls.name}" 
                    placeholder="Nhập tên lớp học" 
                    class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all">
            </div>
            <div class="w-full">
              <label class="block text-sm font-medium text-gray-700 mb-1">Học phí/buổi (VNĐ) *</label>
              <input type="number" id="edit-money-per-lesson" 
                    value="${cls.month.monthCurrent.moneyPerLesson}" 
                    placeholder="Nhập số tiền" 
                    class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all">
            </div>
            <div class="flex gap-4 mt-4">
              <button id="btn-save-edit-class" class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-300 flex items-center gap-2">
                <i class="fas fa-save"></i>
                Lưu thay đổi
              </button>
              <button id="btn-cancel-edit-class" class="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-300 flex items-center gap-2">
                <i class="fas fa-times"></i>
                Hủy bỏ
              </button>
            </div>
          </div>
        </div>
      `;

      document.getElementById("btn-cancel-edit-class").onclick = () =>
        loadClassDetail(className);

      document.getElementById("btn-save-edit-class").onclick = async () => {
        const newName = document.getElementById("edit-class-name").value.trim();
        const newMoney = document
          .getElementById("edit-money-per-lesson")
          .value.trim();

        if (!newName || !newMoney) {
          showError("Vui lòng điền đầy đủ thông tin");
          return;
        }

        try {
          await ipcRenderer.invoke(
            "update-class",
            className,
            newName,
            newMoney
          );
          showSuccess("Cập nhật thông tin lớp thành công!");
          loadClassDetail(newName);
        } catch (error) {
          showError(error.message);
        }
      };
    };

    document
      .getElementById("month-select")
      .addEventListener("change", async (e) => {
        const selectedMonth = e.target.value;
        const students = cls.month[selectedMonth]?.students || [];

        document.getElementById("student-table-body").innerHTML =
          renderStudentTable(students, className, selectedMonth);

        document.getElementById("notes").innerHTML =
          cls.month[selectedMonth]?.notes?.length > 0
            ? cls.month[selectedMonth].notes
                .map(
                  (note) => `
            <li class="flex justify-between items-center bg-blue-50 p-3 rounded-lg">
              <span class="text-gray-700">${note}</span>
              <button onclick="handleDeleteNote('${className}','${note}','${selectedMonth}')" 
                      class="p-1 text-red-600 hover:text-red-800 transition-colors">
                <i class="fas fa-trash"></i>
              </button>
            </li>
          `
                )
                .join("")
            : '<li class="text-center py-4 text-gray-500 italic">Chưa có ghi chú nào</li>';

        setupAttendanceCheckboxes(className, selectedMonth);
        setupStudentDetailButtons(className, selectedMonth);
        setupDeleteStudentButtons(className, selectedMonth);
      });

    document.getElementById("btn-addnote").onclick = () => {
      const month = document.getElementById("month-select").value;
      elements.container.innerHTML = `
        <div class="bg-white p-6 rounded-xl shadow-lg animate-fade-in">
          <h2 class="text-2xl font-bold text-center text-blue-800 mb-6 pb-2 border-b border-blue-200">
            <i class="fas fa-plus-circle mr-2"></i>
            Thêm ghi chú cho lớp ${className}
          </h2>
          <div class="flex flex-col items-center gap-4 max-w-md mx-auto">
            <div class="w-full">
              <label class="block text-sm font-medium text-gray-700 mb-1">Nội dung ghi chú *</label>
              <textarea id="new-note-content" placeholder="Nhập nội dung ghi chú..." 
                        class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all h-32"></textarea>
            </div>
            <div class="flex gap-4 mt-4">
              <button id="btn-save-note" class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-300 flex items-center gap-2">
                <i class="fas fa-save"></i>
                Lưu ghi chú
              </button>
              <button id="btn-cancel-note" class="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-300 flex items-center gap-2">
                <i class="fas fa-times"></i>
                Hủy bỏ
              </button>
            </div>
          </div>
        </div>
      `;

      document.getElementById("btn-cancel-note").onclick = () =>
        loadClassDetail(className);

      document.getElementById("btn-save-note").onclick = async () => {
        const note = document.getElementById("new-note-content").value.trim();

        if (!note) {
          showError("Vui lòng nhập nội dung ghi chú");
          return;
        }

        try {
          await ipcRenderer.invoke("add-note", className, note, month);
          showSuccess("Đã thêm ghi chú thành công!");
          loadClassDetail(className);
        } catch (error) {
          showError(error.message);
        }
      };
    };

    // Setup interactive elements
    setupAttendanceCheckboxes(className, "monthCurrent");
    setupStudentDetailButtons(className, "monthCurrent");
    setupDeleteStudentButtons(className, "monthCurrent");
    setupEditableMoneyCells(className, "monthCurrent");
  } catch (error) {
    showError("Lỗi khi tải thông tin lớp học: " + error.message);
    loadClasses();
  }
};

// Student detail functions
const loadStudentDetail = async (className, studentName, month) => {
  try {
    const student = await ipcRenderer.invoke(
      "get-student-detail",
      className,
      studentName,
      month
    );
    if (!student) throw new Error("Không tìm thấy học sinh");

    elements.container.innerHTML = `
      <div class="animate-fade-in">
        <!-- Header -->
        <div class="bg-blue-600 text-white p-6 rounded-t-lg">
          <div class="flex justify-between items-center">
            <div>
              <h2 class="text-2xl font-bold flex items-center gap-3">
                <i class="fas fa-user-graduate"></i>
                ${student.name}
              </h2>
              <p class="mt-1">
                <span class="font-medium">Lớp:</span> ${className}
                <span class="ml-4 font-medium">Tháng:</span> ${
                  month === "monthCurrent"
                    ? "Hiện tại"
                    : month.replace("MonthAgo", " tháng trước")
                }
              </p>
            </div>
            <div class="flex gap-2">
              <button id="btn-edit-student" class="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors duration-200 flex items-center gap-2">
                <i class="fas fa-edit"></i>
                Sửa thông tin
              </button>
              <button id="btn-back-to-class" class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200 flex items-center gap-2">
                <i class="fas fa-arrow-left"></i>
                Quay lại
              </button>
            </div>
          </div>
        </div>

        <!-- Student Info Section -->
        <div class="bg-white p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <!-- Thông tin cơ bản -->
          <div class="bg-blue-50 p-6 rounded-lg">
            <h3 class="text-lg font-semibold text-blue-800 mb-4 flex items-center gap-2">
              <i class="fas fa-info-circle"></i>
              Thông tin học sinh
            </h3>
            <div class="space-y-3">
              <p><span class="font-medium">Tên:</span> ${student.name}</p>
              <p><span class="font-medium">SĐT:</span> ${
                student.mobile || "Chưa cập nhật"
              }</p>
              <p><span class="font-medium">Tổng buổi học:</span> ${
                student.attendances?.length || 0
              }</p>
              <p><span class="font-medium">Tổng học phí:</span> ${(
                student.totalMoney || 0
              ).toLocaleString()} VNĐ</p>
              <p><span class="font-medium">Tiền tài liệu:</span> ${(
                student.moneyDocument || 0
              ).toLocaleString()} VNĐ</p>
              <p><span class="font-medium">Tổng tiền:</span> ${(
                (Number(student.totalMoney) || 0) +
                (Number(student.moneyDocument) || 0)
              ).toLocaleString()} VNĐ</p>
            </div>
          </div>

          <!-- Danh sách điểm danh -->
          <div class="bg-blue-50 p-6 rounded-lg md:col-span-2">
            <h3 class="text-lg font-semibold text-blue-800 mb-4 flex items-center gap-2">
              <i class="fas fa-calendar-check"></i>
              Lịch sử điểm danh (${student.attendances?.length || 0} buổi)
            </h3>
            ${
              student.attendances?.length > 0
                ? `
              <div class="max-h-60 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2">
                ${student.attendances
                  .map(
                    (date) => `
                  <div class="bg-white p-3 rounded-lg shadow-sm flex justify-between items-center">
                    <span>${date}</span>
                    <button class="delete-attendance-btn text-red-600 hover:text-red-800 p-1" 
                            data-date="${date}" data-month="${month}">
                      <i class="fas fa-trash"></i>
                    </button>
                  </div>
                `
                  )
                  .join("")}
              </div>
            `
                : `
              <p class="text-gray-500 italic">Chưa có dữ liệu điểm danh</p>
            `
            }
          </div>
        </div>

        <!-- Ghi chú và các phần khác -->
        <div class="bg-white p-6 border-t">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Phần ghi chú -->
            <div class="bg-blue-50 p-6 rounded-lg">
              <div class="flex justify-between items-center mb-4">
                <h3 class="text-lg font-semibold text-blue-800 flex items-center gap-2">
                  <i class="fas fa-clipboard"></i>
                  Ghi chú
                </h3>
                <button id="btn-add-note" class="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200">
                  <i class="fas fa-plus"></i> Thêm
                </button>
              </div>
              
              ${
                student.notes?.length > 0
                  ? `
                <div class="max-h-48 overflow-y-auto">
                  <ul class="space-y-2">
                    ${student.notes
                      .map(
                        (note) => `
                      <li class="flex justify-between items-center bg-white p-3 rounded-lg shadow-sm">
                        <span>${note}</span>
                        <button onclick="handleDeleteStudentNote('${className}', '${studentName}', '${note}', '${month}')" 
                                class="p-1 text-red-600 hover:text-red-800">
                          <i class="fas fa-trash"></i>
                        </button>
                      </li>
                    `
                      )
                      .join("")}
                  </ul>
                </div>
              `
                  : `
                <p class="text-gray-500 italic">Chưa có ghi chú nào</p>
              `
              }
              <div id="form-new-note" style="display :none;">
                <input class="px-4 py-2" type="text" id="new-note-content" 
                     placeholder="Nhập ghi chú mới..." />
                <button id="btn-save-note-student" class="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200">Lưu</button>
              </div>
            </div>

            <!-- Form thêm điểm danh -->
            <div class="bg-blue-50 p-6 rounded-lg">
              <h3 class="text-lg font-semibold text-blue-800 mb-4 flex items-center gap-2">
                <i class="fas fa-plus-circle"></i>
                Thêm điểm danh
              </h3>
              <div class="flex flex-col sm:flex-row gap-4">
                <input type="date" id="new-attendance-date" 
                      class="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                <button id="btn-add-attendance" class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200">
                  <i class="fas fa-check mr-2"></i>Xác nhận
                </button>
              </div>
              <p class="text-xs text-gray-500 mt-2">Chỉ thêm được cho tháng hiện tại</p>
            </div>
          </div>
        </div>

        <!-- Modal sửa thông tin học sinh -->
        <div id="edit-student-modal" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div class="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div class="p-6">
              <div class="flex justify-between items-center mb-4">
                <h3 class="text-xl font-bold text-gray-800">
                  <i class="fas fa-user-edit mr-2"></i>
                  Sửa thông tin học sinh
                </h3>
                <button id="btn-close-edit-modal" class="text-gray-500 hover:text-gray-700">
                  <i class="fas fa-times text-xl"></i>
                </button>
              </div>
              
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Tên học sinh *</label>
                  <input type="text" id="edit-student-name" value="${
                    student.name
                  }" 
                        class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
                  <input type="text" id="edit-student-mobile" value="${
                    student.mobile || ""
                  }" 
                        class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                </div>
              </div>
              
              <div class="flex justify-end gap-4 mt-6">
                <button id="btn-cancel-edit" class="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600">
                  Hủy bỏ
                </button>
                <button id="btn-save-edit" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Lưu thay đổi
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Xử lý sự kiện thêm điểm danh
    document.getElementById("btn-add-attendance").onclick = async () => {
      const dateInput = document.getElementById("new-attendance-date");
      const selectedDate = dateInput.value;

      if (!selectedDate) {
        showError("Vui lòng chọn ngày");
        return;
      }

      try {
        const formattedDate = dayjs(selectedDate).format("YYYY-MM-DD");

        // Kiểm tra ngày đã tồn tại
        if (student.attendances?.includes(formattedDate)) {
          showError("Ngày này đã được điểm danh");
          return;
        }

        await ipcRenderer.invoke(
          "update-student-attendance",
          className,
          studentName,
          "add",
          formattedDate,
          month
        );

        showSuccess(
          `Đã thêm điểm danh ngày ${dayjs(formattedDate).format("DD/MM/YYYY")}`
        );
        loadStudentDetail(className, studentName, month);
      } catch (error) {
        showError(error.message);
      } finally {
        dateInput.value = "";
      }
    };

    // Xử lý xóa điểm danh
    document.querySelectorAll(".delete-attendance-btn").forEach((btn) => {
      btn.onclick = async () => {
        let dateToDelete = btn.dataset.date;
        const monthToUpdate = btn.dataset.month;
        dateToDelete = dateToDelete.split(", ")[1];

        let a = dateToDelete.replaceAll("/", "-");

        const [day, monthD, year] = a.split("-");
        const dataday = `${year}-${monthD}-${day}`;

        if (confirm(`Xác nhận xóa điểm danh ngày ${dateToDelete}?`)) {
          try {
            await ipcRenderer.invoke(
              "update-student-attendance",
              className,
              studentName,
              "remove",
              dataday,
              monthToUpdate
            );

            showSuccess("Đã xóa điểm danh thành công");
            loadStudentDetail(className, studentName, month);
          } catch (error) {
            showError(error.message);
          }
        }
      };
    });

    // Xử lý modal sửa thông tin học sinh
    document.getElementById("btn-edit-student").onclick = () => {
      document.getElementById("edit-student-modal").classList.remove("hidden");
    };

    document.getElementById("btn-close-edit-modal").onclick = () => {
      document.getElementById("edit-student-modal").classList.add("hidden");
    };

    document.getElementById("btn-cancel-edit").onclick = () => {
      document.getElementById("edit-student-modal").classList.add("hidden");
    };

    document.getElementById("btn-save-edit").onclick = async () => {
      const newName = document.getElementById("edit-student-name").value.trim();
      const newMobile = document
        .getElementById("edit-student-mobile")
        .value.trim();

      if (!newName) {
        showError("Vui lòng nhập tên học sinh");
        return;
      }

      try {
        // Cập nhật tên nếu có thay đổi
        if (newName !== studentName) {
          await ipcRenderer.invoke(
            "update-student-field",
            className,
            studentName,
            "name",
            newName,
            month
          );
        }

        // Cập nhật số điện thoại
        await ipcRenderer.invoke(
          "update-student-field",
          className,
          newName,
          "mobile",
          newMobile,
          month
        );

        showSuccess("Cập nhật thông tin thành công");
        document.getElementById("edit-student-modal").classList.add("hidden");
        loadStudentDetail(className, newName, month);
      } catch (error) {
        showError(error.message);
      }
    };

    // Xử lý thêm ghi chú (giữ nguyên từ phiên bản trước)
    document.getElementById("btn-add-note").onclick = () => {
      const noteInput = document.getElementById("new-note-content");
      const btnSaveNote = document.getElementById("btn-save-note-student");
      const formNewNote = document.getElementById("form-new-note");
      formNewNote.style.display = "block";
      noteInput.focus();

      btnSaveNote.onclick = () => {
        const noteContent = noteInput.value.trim();
        if (noteContent && noteContent.trim()) {
          ipcRenderer
            .invoke(
              "add-student-note",
              className,
              studentName,
              noteContent.trim(),
              month
            )
            .then(() => {
              showSuccess("Đã thêm ghi chú thành công");
              loadStudentDetail(className, studentName, month);
            })
            .catch((err) => showError(err.message));
        }
      };
    };

    // Xử lý quay lại
    document.getElementById("btn-back-to-class").onclick = () => {
      loadClassDetail(className);
    };
  } catch (error) {
    showError("Lỗi khi tải thông tin học sinh: " + error.message);
    loadClasses();
  }
};

// Hàm toàn cục để xóa ghi chú
window.handleDeleteStudentNote = (clsName, stdName, note, mth) => {
  if (confirm("Bạn có chắc muốn xóa ghi chú này?")) {
    ipcRenderer
      .invoke("delete-student-note", clsName, stdName, note, mth)
      .then(() => {
        showSuccess("Đã xóa ghi chú thành công");
        loadStudentDetail(clsName, stdName, mth);
      })
      .catch((err) => showError(err.message));
  }
};

// Setup functions
const setupAttendanceCheckboxes = (className, month) => {
  if (month !== "monthCurrent") return;

  document.querySelectorAll(".attendance-checkbox").forEach((box) => {
    const studentName = box.dataset.name;

    box.onchange = async () => {
      await ipcRenderer.invoke(
        "mark-attendance",
        className,
        studentName,
        box.checked
      );
      loadClassDetail(className);
    };
  });
};

const setupStudentDetailButtons = (className, month) => {
  document.querySelectorAll(".view-student-btn").forEach((btn) => {
    btn.onclick = () => {
      const studentName = btn.dataset.name;
      loadStudentDetail(className, studentName, month);
    };
  });
};

const setupDeleteStudentButtons = (className, month) => {
  document.querySelectorAll(".delete-student-btn").forEach((btn) => {
    btn.onclick = () => {
      const studentName = btn.dataset.name;
      if (confirm(`Bạn có chắc chắn muốn xóa học sinh ${studentName}?`)) {
        ipcRenderer
          .invoke("delete-student", className, studentName)
          .then(() => {
            showSuccess(`Đã xóa học sinh ${studentName}`);
            loadClassDetail(className);
          })
          .catch((err) => showError(err.message));
      }
    };
  });
};

const setupEditableMoneyCells = (className, month) => {
  document.querySelectorAll(".editable-money-cell").forEach((td) => {
    td.addEventListener("click", async () => {
      const studentName = td.dataset.student;
      const currentValue = parseInt(td.textContent.replace(/[^0-9]/g, "")) || 0;
      const field = td.dataset.field;

      const input = document.createElement("input");
      input.type = "text";
      input.value = currentValue;
      input.className =
        "w-full p-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500";

      const saveValue = async () => {
        const value = input.value.trim();
        if (!value) return;

        try {
          const result = Function('"use strict";return (' + value + ")")();
          if (isNaN(result)) throw new Error("Giá trị không hợp lệ");

          await ipcRenderer.invoke(
            "update-student-field",
            className,
            studentName,
            field,
            Math.round(result),
            month
          );
          loadClassDetail(className);
        } catch (error) {
          showError("Giá trị không hợp lệ: " + error.message);
          td.innerHTML = `${currentValue.toLocaleString()} VNĐ`;
        }
      };

      input.addEventListener("blur", saveValue);
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") input.blur();
        if (e.key === "Escape") {
          td.innerHTML = `${currentValue.toLocaleString()} VNĐ`;
        }
      });

      td.innerHTML = "";
      td.appendChild(input);
      input.focus();
      input.select();
    });
  });
};

// Global functions
window.handleDeleteNote = (className, note, month) => {
  if (confirm("Bạn có chắc chắn muốn xóa ghi chú này?")) {
    ipcRenderer
      .invoke("delete-note", className, note, month)
      .then(() => loadClassDetail(className))
      .catch((err) => showError(err.message));
  }
};

// Initialize event listeners
elements.btnAdd.addEventListener("click", handleAddClassClick);
elements.btnCancel.addEventListener("click", handleCancelClassClick);
elements.btnSave.addEventListener("click", handleSaveClassClick);

// Start the app
loadClasses();
