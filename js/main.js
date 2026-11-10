/**
 * 앱 진입점.
 *
 * 흐름
 *  1. 지도 경계 데이터·여행 정보 로드 (동시에)
 *     읍·면·동 경계는 크기가 커서 첫 화면이 뜬 뒤 뒤에서 불러온다.
 *  2. 지역 저장소·선택 모델·팝업·페이지 생성
 *  3. 페이지 이동 연결
 *     ① 후보 선택(SelectView) → ② 여행지 돌림판(PickView) → ③ 세부 지역 돌림판(DetailView)
 */
import { DATA_URL, REGION_INFO_URL, SUBMUNICIPALITY_URL } from './config.js';
import { loadTopology } from './data/topology-loader.js';
import { RegionRepository } from './data/region-repository.js';
import { loadRegionInfo } from './data/region-info-repository.js';
import { SelectionModel } from './model/selection-model.js';
import { VisitedStore } from './model/visited-store.js';
import { StepIndicator } from './ui/step-indicator.js';
import { RegionPopup } from './ui/region-popup.js';
import { ResultModal } from './ui/result-modal.js';
import { byId } from './ui/dom.js';
import { SelectView } from './views/select-view.js';
import { PickView } from './views/pick-view.js';
import { DetailView } from './views/detail-view.js';

/** 앱을 시작한다. */
async function main() {
  const status = byId('app-status');
  let topology, info;
  try {
    // 여행 정보는 실패해도 빈 저장소가 오므로, 지도 데이터 실패만 치명적이다.
    [topology, info] = await Promise.all([loadTopology(DATA_URL), loadRegionInfo(REGION_INFO_URL)]);
  } catch (err) {
    showLoadError(status, err);
    return;
  }
  status.hidden = true;

  const repo = new RegionRepository(topology);
  const app = createApp(repo, info);
  app.go.select();
  repo.loadSubmunicipalities(SUBMUNICIPALITY_URL);   // 기다리지 않음 (필요한 곳에서 repo.townsReady 대기)
  redrawWheelsWhenFontsReady([app.pickView, app.detailView]);
}

/**
 * 페이지들을 만들고 이동 경로를 연결한다.
 * @param {RegionRepository} repo
 * @param {import('./data/region-info-repository.js').RegionInfoRepository} info
 */
function createApp(repo, info) {
  const model = new SelectionModel();
  const steps = new StepIndicator(['step-label-1', 'step-label-2', 'step-label-3'].map(byId));
  const popup = new RegionPopup();
  const resultModal = new ResultModal(() => go.restart());
  const shared = { repo, info, model, steps, popup, resultModal };

  /** 페이지 이동: 모든 페이지를 숨기고 하나만 연다. */
  const go = {
    select: () => { hideAll(); selectView.show(); },
    pick: () => { hideAll(); pickView.show(); },
    detail: async () => {
      await repo.townsReady;          // 읍·면·동 경계가 아직 오는 중이면 기다린다
      hideAll();
      detailView.open(model.picked);
    },
    restart: () => { model.clear(); go.select(); },
  };

  const selectView = new SelectView({ ...shared, visited: new VisitedStore(), onNext: go.pick });
  const pickView = new PickView({ ...shared, onBack: go.select, onNext: go.detail, onRestart: go.restart });
  const detailView = new DetailView({ ...shared, onBack: go.pick, onRestart: go.restart });

  const pages = [selectView, pickView, detailView];
  function hideAll() {
    pages.forEach((p) => p.hide());
  }

  return { repo, model, selectView, pickView, detailView, go };
}

/**
 * 데이터 로드 실패 안내.
 * file:// 로 열면 브라우저가 fetch 를 막으므로 그 경우를 따로 알려준다.
 * @param {HTMLElement} el
 * @param {Error} err
 */
function showLoadError(el, err) {
  console.error(err);
  const fromFile = location.protocol === 'file:';
  el.classList.add('error');
  el.textContent = fromFile
    ? '파일을 직접 열면 지도 데이터를 불러올 수 없습니다. 로컬 웹 서버로 열어 주세요 (README 참고).'
    : `지도 데이터를 불러오지 못했습니다: ${err.message}`;
}

/**
 * 웹폰트(Pretendard)가 늦게 로드되면 캔버스 글자가 기본 글꼴로 그려지므로 다시 그린다.
 * @param {{redraw: () => void}[]} views
 */
function redrawWheelsWhenFontsReady(views) {
  document.fonts?.ready.then(() => views.forEach((v) => v.redraw()));
}

main();
