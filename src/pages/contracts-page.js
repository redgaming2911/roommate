import { ContractService } from "../services/contract-service.js";
import { renderContractForm } from "../components/contract-form.js";
import { renderContractDetail } from "../components/contract-detail.js";

const state = {
  contracts: [],
  keyword: "",
  status: "",
  roomId: "",
  dateRange: {},
  selectedContract: null,
};

export async function renderContractsPage(container) {
  container.innerHTML = `
    <div class="contracts-page">
      <div class="page-header">
        <h1 data-testid="page-title">Quản lý hợp đồng</h1>
        <button data-testid="btn-create" class="btn-primary">+ Tạo hợp đồng</button>
      </div>

      <div class="filters">
        <input data-testid="search-input" placeholder="Nhập mã hợp đồng..." />
        <select data-testid="filter-status">
          <option value="">Tất cả trạng thái</option>
          <option value="active">Đang hiệu lực</option>
          <option value="expiring">Sắp hết hạn</option>
          <option value="expired">Hết hạn</option>
          <option value="cancelled">Đã hủy</option>
        </select>
      </div>

      <div data-testid="contracts-list" class="contracts-list"></div>

      <div id="contract-modal"></div>
    </div>
  `;

  bindEvents(container);
  await loadContracts(container);
}

async function loadContracts(container) {
  state.contracts = ContractService.getContracts();

  renderList(container);
}

function renderList(container) {
  const listEl = container.querySelector("[data-testid='contracts-list']");

  const filtered = ContractService.filterContracts({
    keyword: state.keyword,
    status: state.status,
  });

  listEl.innerHTML = filtered
    .map(
      (c) => `
    <div class="contract-row" data-testid="contract-row">
      <div>${c.code}</div>
      <div>${c.roomName || ""}</div>
      <div>${c.startDate}</div>
      <div>${c.endDate}</div>
      <div class="status ${c.status}">${c.status}</div>

      <div class="actions">
        <button data-action="view" data-id="${c.id}">👁</button>
        <button data-action="activate" data-id="${c.id}">▶</button>
        <button data-action="end" data-id="${c.id}">⏹</button>
        <button data-action="cancel" data-id="${c.id}">❌</button>
      </div>
    </div>
  `
    )
    .join("");
}

function bindEvents(container) {
  container.addEventListener("click", async (e) => {
    const id = e.target.dataset.id;

    if (e.target.dataset.action === "view") {
      openDetail(container, id);
    }

    if (e.target.dataset.action === "activate") {
      await ContractService.activateContract(id);
      await loadContracts(container);
    }

    if (e.target.dataset.action === "end") {
      await ContractService.endContract(id, new Date().toISOString());
      await loadContracts(container);
    }

    if (e.target.dataset.action === "cancel") {
      await ContractService.cancelContract(id);
      await loadContracts(container);
    }

    if (e.target.dataset.testid === "btn-create") {
      openForm(container);
    }
  });

  container.querySelector("[data-testid='search-input']")
    .addEventListener("input", (e) => {
      state.keyword = e.target.value;
      renderList(container);
    });

  container.querySelector("[data-testid='filter-status']")
    .addEventListener("change", (e) => {
      state.status = e.target.value;
      renderList(container);
    });
}

function openForm(container) {
  const modal = container.querySelector("#contract-modal");
  modal.innerHTML = renderContractForm({
    onSubmit: async (data) => {
      await ContractService.createContract(data);
      modal.innerHTML = "";
      await loadContracts(container);
    },
  });
}

function openDetail(container, id) {
  const contract = ContractService.getContractById(id);
  const modal = container.querySelector("#contract-modal");

  modal.innerHTML = renderContractDetail(contract, {
    onClose: () => (modal.innerHTML = ""),
    onExtend: async (date) => {
      await ContractService.extendContract(id, date);
      modal.innerHTML = "";
      await loadContracts(container);
    },
  });
}