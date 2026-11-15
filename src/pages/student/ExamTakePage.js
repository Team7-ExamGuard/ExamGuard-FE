import { useNavigate, useParams } from "react-router-dom";

// TODO(5단계): 상단 바(남은 시간·저장 상태·오프라인 배너), 문항 네비게이터, 문항 본문,
// 답안 복원(version 비교), 자동 저장/재시도 큐, 제출 모달, 시간 종료 자동 제출
export default function ExamTakePage() {
  const { examId } = useParams();
  const navigate = useNavigate();
  return (
    <main className="page">
      <h1>시험 응시</h1>
      <p className="placeholder">시험 {examId}의 문항 화면이 들어갈 자리</p>
      <button className="btn btn-primary" onClick={() => navigate(`/exam/${examId}/done`)}>
        (임시) 최종 제출
      </button>
    </main>
  );
}
