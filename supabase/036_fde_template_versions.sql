-- Versioned FDE KIT default template and manual per-deployment synchronization.
-- Additive migration; run after 034_fde_kit_sync.sql and 035_context_items_source.sql.

create table if not exists public.fde_template_versions (
  version      bigint primary key check (version > 0),
  content      jsonb not null,
  published_at timestamptz not null default now()
);

insert into public.fde_template_versions (version, content)
values (1, '{"version":1,"groups":[{"id":"pre-g0","phaseId":"pre","title":"Knowledge preparation","taskIds":["pre-g0-t0","pre-g0-t1","pre-g0-t2","pre-g0-t3","pre-g0-t4","pre-g0-t5"]},{"id":"pre-g1","phaseId":"pre","title":"Deployment thesis and scoping","taskIds":["pre-g1-t0","pre-g1-t1","pre-g1-t2","pre-g1-t3"]},{"id":"pre-g2","phaseId":"pre","title":"The working prototype","taskIds":["pre-g2-t0","pre-g2-t1"]},{"id":"pre-g3","phaseId":"pre","title":"Marketing capture plan","taskIds":["pre-g3-t0"]},{"id":"pre-g4","phaseId":"pre","title":"Measurement design, not measurement","taskIds":["pre-g4-t0","pre-g4-t1","pre-g4-t2"]},{"id":"pre-g5","phaseId":"pre","title":"Timeline","taskIds":["pre-g5-t0"]},{"id":"during-g0","phaseId":"during","title":"Ngày đầu tiên","taskIds":["during-g0-t0","during-g0-t1"],"titleKey":"deployment:template.during.g0.name"},{"id":"during-g1","phaseId":"during","title":"Tuần đầu tiên","taskIds":["during-g1-t0","during-g1-t1","during-g1-t2","during-g1-t3","during-g1-t4"],"titleKey":"deployment:template.during.g1.name"},{"id":"during-g2","phaseId":"during","title":"Scoping","taskIds":["during-g2-t0","during-g2-t1","during-g2-t2","during-g2-t3","during-g2-t4","during-g2-t5","during-g2-t6","during-g2-t7"],"titleKey":"deployment:template.during.g2.name"},{"id":"during-g3","phaseId":"during","title":"Audit hệ thống & dữ liệu","taskIds":["during-g3-t0","during-g3-t1","during-g3-t2","during-g3-t3"],"titleKey":"deployment:template.during.g3.name"},{"id":"after-g0","phaseId":"after","title":"Bàn giao","taskIds":["after-g0-t0","after-g0-t1","after-g0-t2","after-g0-t3","after-g0-t4"],"titleKey":"deployment:template.after.g0.name"},{"id":"after-g1","phaseId":"after","title":"Theo dõi sau triển khai","taskIds":["after-g1-t0","after-g1-t1","after-g1-t2"],"titleKey":"deployment:template.after.g1.name"}],"tasks":{"pre-g0-t0":{"id":"pre-g0-t0","groupId":"pre-g0","title":"Tailored customer expectation of each role in factories","description":"","done":false,"required":false,"needsTemplate":false,"note":"","subtasks":[{"id":"pre-g0-t0-s0","title":"Sketch four roles, accepting that on a first visit you may only know one","description":"Economic buyer — signs, cares about money\nChampion — wants us to win, has internal capital to spend\nOperator — whose working day changes\nBlocker — a supervisor or line leader who reads this as surveillance","done":false},{"id":"pre-g0-t0-s1","title":"For each: what they win, what they fear. Interests and incentives only. Never write down personality assessments. That note becomes a liability the moment anyone else sees it.","description":"","done":false},{"id":"pre-g0-t0-s2","title":"Treat the whole map as unconfirmed until day one.","description":"","done":false}],"links":[],"attachments":[],"updatedAt":"2026-07-28T08:00:00.000Z","updatedBy":"Minh Trần"},"pre-g0-t1":{"id":"pre-g0-t1","groupId":"pre-g0","title":"Understand the physical process that the software works on","description":"Learn where time and cost build up, where rework starts, and what usually limits throughput in this type of factory.","done":false,"required":false,"needsTemplate":false,"note":"","subtasks":[],"links":[],"attachments":[],"updatedAt":"2026-07-28T08:00:00.000Z","updatedBy":"Minh Trần"},"pre-g0-t2":{"id":"pre-g0-t2","groupId":"pre-g0","title":"Build a vocabulary sheet","description":"Collect at least fifty terms that operators use, including local-language terms and their English equivalents. Use the language people actually use on the factory floor. (Get to know the factory field of knowledge.)","done":false,"required":false,"needsTemplate":false,"note":"","subtasks":[],"links":[],"attachments":[],"updatedAt":"2026-07-28T08:00:00.000Z","updatedBy":"Minh Trần"},"pre-g0-t3":{"id":"pre-g0-t3","groupId":"pre-g0","title":"Review the company''s public footprint","description":"Look at its certifications, customers, recent investments, and regulatory requirements. Identify the business pressures these may create for the owner or management team.","done":false,"required":false,"needsTemplate":false,"note":"","subtasks":[],"links":[],"attachments":[],"updatedAt":"2026-07-28T08:00:00.000Z","updatedBy":"Minh Trần"},"pre-g0-t4":{"id":"pre-g0-t4","groupId":"pre-g0","title":"Investigate existing and past systems","description":"Use public information and the discovery call to understand what software the company has adopted, replaced, or stopped using — and why those efforts succeeded or failed.","done":false,"required":false,"needsTemplate":false,"note":"","subtasks":[],"links":[],"attachments":[],"updatedAt":"2026-07-28T08:00:00.000Z","updatedBy":"Minh Trần"},"pre-g0-t5":{"id":"pre-g0-t5","groupId":"pre-g0","title":"Review the failure archive from the previous three deployments","description":"Identify recurring technical, operational, and adoption issues before starting the next deployment.","done":false,"required":false,"needsTemplate":false,"note":"","subtasks":[],"links":[],"attachments":[],"updatedAt":"2026-07-28T08:00:00.000Z","updatedBy":"Minh Trần"},"pre-g1-t0":{"id":"pre-g1-t0","groupId":"pre-g1","title":"Run a discovery call/meeting with the factory stakeholders","description":"Make sure to discover as many pain points as possible and get an overview of the workflow. If no call is scheduled, mark as No.","done":false,"required":false,"needsTemplate":false,"note":"","subtasks":[{"id":"pre-g1-t0-s0","title":"Align expectations and our platform use case","description":"","done":false},{"id":"pre-g1-t0-s1","title":"Document the factory stakeholders'' personalities","description":"","done":false}],"links":[],"attachments":[],"updatedAt":"2026-07-28T08:00:00.000Z","updatedBy":"Minh Trần"},"pre-g1-t1":{"id":"pre-g1-t1","groupId":"pre-g1","title":"Write a one-page deployment thesis that clearly defines","description":"Target workflow and factory scope\nIdentify the specific workflow(s) we intend to improve, the factory function or operational area where they occur, and the part of the process our system will directly affect.\n\nPrimary affected role\nName the role most directly affected by the workflow and deployment — for example, a worker, line supervisor, production manager, or factory leader. Explain why this role is the primary user, decision-maker, or beneficiary.\n\nWorkflow frequency and time per shift (factory-side human workflow)\nEstimate how frequently the primary role performs or interacts with this workflow during a typical shift, including:\n- number of workflow executions or interactions per shift\n- average time spent per interaction\n- total time spent on the workflow per shift\n\nCost of maintaining the current workflow\nDescribe the negative impact of continuing to use the current system or process without making a change. Quantify the impact where possible, including:\n- time lost per worker, shift, or production cycle\n- additional labor or operational effort\n- workflow errors, delays, rework, or production disruptions\n- reduced productivity, throughput, or operational visibility\n- financial losses or other measurable business impact\n- Our hypothesis about why the current workflow fails: state our belief about the underlying reason the current workflow produces these problems. Frame it as a specific, testable, and falsifiable hypothesis. Example: \"We believe production reporting is delayed because workers must manually transfer information between multiple systems. This hypothesis would be disproven if reporting delays remain unchanged after the manual transfer step is removed.\"\n\nAdoption and migration cost\nDefine what may cause the factory to hesitate, delay, or resist moving from the current system to our solution. Quantify the expected cost or effort of adoption where possible, including:\n- implementation and migration time\n- employee training and onboarding effort\n- operational effort required to change existing processes\n- temporary workflow disruption or productivity loss during the transition\n- financial cost and other resources required for deployment\n- Our hypothesis about each adoption barrier: for every major reason the factory may hesitate, state our belief about why that concern exists and frame it as a specific, testable, and falsifiable hypothesis. Example: \"We believe production managers will hesitate to adopt the system because they expect migration to interrupt production reporting. This hypothesis would be disproven if the system can be deployed without measurable reporting downtime.\"\n\nExpected measurable improvement\nDefine the outcome we expect the deployment to produce and express it as a measurable number, such as:\n- time saved per worker or per shift\n- reduction in manual work or operational effort\n- reduction in workflow errors, delays, or rework\n- faster task completion or decision-making\n- improvement in productivity, throughput, or operational visibility","done":false,"required":false,"needsTemplate":false,"note":"","subtasks":[],"links":[],"attachments":[],"updatedAt":"2026-07-28T08:00:00.000Z","updatedBy":"Minh Trần"},"pre-g1-t2":{"id":"pre-g1-t2","groupId":"pre-g1","title":"Map the use case to modules (PLAN, PRODUCE, MOVE, MAINTAIN, INSPECT, MONITOR, PROTECT, OPTIMIZE) and name the starting rung on the autonomy ladder","description":"Almost always Knowledge. If the call can confirm this, do it. If there is no call, research and predict.","done":false,"required":false,"needsTemplate":false,"note":"","subtasks":[],"links":[],"attachments":[],"updatedAt":"2026-07-28T08:00:00.000Z","updatedBy":"Minh Trần"},"pre-g1-t3":{"id":"pre-g1-t3","groupId":"pre-g1","title":"Define the Quick-Win Prototype: the smallest POC (proof of concept) that proves the thesis in front of a real operator, not just a manager.","description":"","done":false,"required":false,"needsTemplate":false,"note":"","subtasks":[],"links":[],"attachments":[],"updatedAt":"2026-07-28T08:00:00.000Z","updatedBy":"Minh Trần"},"pre-g2-t0":{"id":"pre-g2-t0","groupId":"pre-g2","title":"With a meeting/call","description":"","done":false,"required":false,"needsTemplate":false,"note":"","subtasks":[{"id":"pre-g2-t0-s0","title":"Build the demo after the meeting using what we learned: their stations, defect names, layout, and actual workflow. It should match one specific use case they described.","description":"","done":false},{"id":"pre-g2-t0-s1","title":"Create a slide deck with fewer than five slides. Show the business problem and support it with market research: cost, lost revenue, or operational risk.","description":"","done":false},{"id":"pre-g2-t0-s2","title":"Demo one user workflow from start to finish in under seven minutes.","description":"","done":false},{"id":"pre-g2-t0-s3","title":"Make it work offline. Do not depend on factory Wi-Fi. Why?","description":"","done":false},{"id":"pre-g2-t0-s4","title":"Build a phone view for operators on the floor and a larger-screen view for managers or owners. Prioritize the operator experience. Defer.","description":"","done":false},{"id":"pre-g2-t0-s5","title":"Test the demo against likely failures: incorrect model output, no network, unexpected input, and questions about job losses.","description":"","done":false}],"links":[],"attachments":[],"updatedAt":"2026-07-28T08:00:00.000Z","updatedBy":"Minh Trần"},"pre-g2-t1":{"id":"pre-g2-t1","groupId":"pre-g2","title":"Without a meeting/call","description":"","done":false,"required":false,"needsTemplate":false,"note":"","subtasks":[{"id":"pre-g2-t1-s0","title":"Build a rough demo using public information, industry knowledge, and the customer''s own sector vocabulary. Show it during the call to test assumptions and get the customer talking. Do not treat it as a finished solution.","description":"","done":false},{"id":"pre-g2-t1-s1","title":"Create a slide deck with fewer than five slides. Show the likely business problem and support it with market research: cost, lost revenue, or operational risk.","description":"","done":false},{"id":"pre-g2-t1-s2","title":"Demo one use case from start to finish in under seven minutes.","description":"","done":false},{"id":"pre-g2-t1-s3","title":"Make it work offline. Do not depend on factory Wi-Fi.","description":"","done":false},{"id":"pre-g2-t1-s4","title":"Build a phone view for operators on the floor and a larger-screen view for managers or owners. Prioritize the operator experience.","description":"","done":false},{"id":"pre-g2-t1-s5","title":"Test the demo against likely failures: incorrect model output, no network, unexpected input, and questions about job losses.","description":"","done":false}],"links":[],"attachments":[],"updatedAt":"2026-07-28T08:00:00.000Z","updatedBy":"Minh Trần"},"pre-g3-t0":{"id":"pre-g3-t0","groupId":"pre-g3","title":"Plan the capture list: one operator quote, one before-and-after metric, one process story, floor footage.","description":"","done":false,"required":false,"needsTemplate":false,"note":"","subtasks":[],"links":[],"attachments":[],"updatedAt":"2026-07-28T08:00:00.000Z","updatedBy":"Minh Trần"},"pre-g4-t0":{"id":"pre-g4-t0","groupId":"pre-g4","title":"Decide what you would measure and how you could observe it cheaply on day one, with a stopwatch, a tally, or a photo count. Do not ask them to prepare anything.","description":"","done":false,"required":false,"needsTemplate":false,"note":"","subtasks":[],"links":[],"attachments":[],"updatedAt":"2026-07-28T08:00:00.000Z","updatedBy":"Minh Trần"},"pre-g4-t1":{"id":"pre-g4-t1","groupId":"pre-g4","title":"Identify what evidence would be visible on the floor within an hour of arriving.","description":"","done":false,"required":false,"needsTemplate":false,"note":"","subtasks":[],"links":[],"attachments":[],"updatedAt":"2026-07-28T08:00:00.000Z","updatedBy":"Minh Trần"},"pre-g4-t2":{"id":"pre-g4-t2","groupId":"pre-g4","title":"Nothing here is sent to the customer.","description":"","done":false,"required":false,"needsTemplate":false,"note":"","subtasks":[],"links":[],"attachments":[],"updatedAt":"2026-07-28T08:00:00.000Z","updatedBy":"Minh Trần"},"pre-g5-t0":{"id":"pre-g5-t0","groupId":"pre-g5","title":"Define the working schedule for the PIC on both sides.","description":"","done":false,"required":false,"needsTemplate":false,"note":"","subtasks":[],"links":[],"attachments":[],"updatedAt":"2026-07-28T08:00:00.000Z","updatedBy":"Minh Trần"},"during-g0-t0":{"id":"during-g0-t0","groupId":"during-g0","title":"Vận hành","description":"Chốt quyền và lịch trước khi làm bất cứ việc gì trên sàn.","done":true,"required":false,"needsTemplate":false,"note":"","subtasks":[{"id":"during-g0-t0-s0","title":"Xin phê duyệt từ người ra quyết định","description":"","done":true,"titleKey":"deployment:template.during.g0.t0.title.sub0"},{"id":"during-g0-t0-s1","title":"Chốt next step chi tiết cho chuyến field 1 tuần","description":"","done":true,"titleKey":"deployment:template.during.g0.t0.title.sub1"}],"links":[],"attachments":[],"updatedAt":"2026-07-28T08:00:00.000Z","updatedBy":"Minh Trần","titleKey":"deployment:template.during.g0.t0.title","descriptionKey":"deployment:template.during.g0.t0.description"},"during-g0-t1":{"id":"during-g0-t1","groupId":"during-g0","title":"Sản phẩm","description":"Bốn thứ phải mang về sau ngày đầu. Ghi trực tiếp trên whiteboard rồi chụp lại — nhanh hơn mọi công cụ.","done":false,"required":false,"needsTemplate":false,"note":"Anh Hùng (trưởng ca 2) nhập liệu tay 3 lần/ca vào Excel, sai sót nhiều nhất ở khâu đếm pallet cuối ca.","subtasks":[{"id":"during-g0-t1-s0","title":"Vẽ workflow xử lý thực tế theo từng bước — người & máy (whiteboard)","description":"","done":false,"titleKey":"deployment:template.during.g0.t1.title.sub0"},{"id":"during-g0-t1-s1","title":"Ghi tần suất nhập/cập nhật dữ liệu và người phụ trách","description":"","done":false,"titleKey":"deployment:template.during.g0.t1.title.sub1"},{"id":"during-g0-t1-s2","title":"Ghi pain point với hệ thống vận hành hiện tại","description":"","done":false,"titleKey":"deployment:template.during.g0.t1.title.sub2"},{"id":"during-g0-t1-s3","title":"Ghi kỳ vọng về AI Agent và hệ thống vận hành mới","description":"","done":false,"titleKey":"deployment:template.during.g0.t1.title.sub3"}],"links":[],"attachments":[{"id":"during-g0-t1-f0","name":"whiteboard-workflow-d1.jpg","ext":"IMG","size":"3.4 MB","uploadedBy":"Minh Trần","uploadedAt":"2026-07-28T08:00:00.000Z"},{"id":"during-g0-t1-f1","name":"line-3-station-map.jpg","ext":"IMG","size":"2.8 MB","uploadedBy":"Minh Trần","uploadedAt":"2026-07-28T08:00:00.000Z"}],"updatedAt":"2026-07-28T08:00:00.000Z","updatedBy":"Minh Trần","titleKey":"deployment:template.during.g0.t1.title","descriptionKey":"deployment:template.during.g0.t1.description"},"during-g1-t0":{"id":"during-g1-t0","groupId":"during-g1","title":"Dựng bản nháp workflow mới","description":"","done":true,"required":false,"needsTemplate":false,"note":"","subtasks":[],"links":[],"attachments":[],"updatedAt":"2026-07-28T08:00:00.000Z","updatedBy":"Minh Trần","titleKey":"deployment:template.during.g1.t0.title","descriptionKey":"deployment:template.during.g1.t0.description"},"during-g1-t1":{"id":"during-g1-t1","groupId":"during-g1","title":"Review cùng operator và quản lý liên quan","description":"","done":true,"required":false,"needsTemplate":false,"note":"","subtasks":[],"links":[],"attachments":[],"updatedAt":"2026-07-28T08:00:00.000Z","updatedBy":"Minh Trần","titleKey":"deployment:template.during.g1.t1.title","descriptionKey":"deployment:template.during.g1.t1.description"},"during-g1-t2":{"id":"during-g1-t2","groupId":"during-g1","title":"Xác định các khoảng chênh lớn giữa tài liệu và thực tế","description":"","done":false,"required":false,"needsTemplate":false,"note":"","subtasks":[],"links":[],"attachments":[],"updatedAt":"2026-07-28T08:00:00.000Z","updatedBy":"Minh Trần","titleKey":"deployment:template.during.g1.t2.title","descriptionKey":"deployment:template.during.g1.t2.description"},"during-g1-t3":{"id":"during-g1-t3","groupId":"during-g1","title":"Chốt pilot khả thi đầu tiên","description":"","done":false,"required":true,"needsTemplate":false,"note":"","subtasks":[],"links":[],"attachments":[],"updatedAt":"2026-07-28T08:00:00.000Z","updatedBy":"Minh Trần","titleKey":"deployment:template.during.g1.t3.title","descriptionKey":"deployment:template.during.g1.t3.description"},"during-g1-t4":{"id":"during-g1-t4","groupId":"during-g1","title":"Tài liệu marketing: executive summary, hình ảnh, video","description":"","done":false,"required":false,"needsTemplate":false,"note":"","subtasks":[{"id":"during-g1-t4-s0","title":"Executive summary 1 trang","description":"","done":false,"titleKey":"deployment:template.during.g1.t4.title.sub0"},{"id":"during-g1-t4-s1","title":"Bộ ảnh tại xưởng","description":"","done":false,"titleKey":"deployment:template.during.g1.t4.title.sub1"},{"id":"during-g1-t4-s2","title":"Video 60 giây","description":"","done":false,"titleKey":"deployment:template.during.g1.t4.title.sub2"}],"links":[],"attachments":[],"updatedAt":"2026-07-28T08:00:00.000Z","updatedBy":"Minh Trần","titleKey":"deployment:template.during.g1.t4.title","descriptionKey":"deployment:template.during.g1.t4.description"},"during-g2-t0":{"id":"during-g2-t0","groupId":"during-g2","title":"Đi hết workflow thực tế tại hiện trường","description":"","done":false,"required":false,"needsTemplate":false,"note":"","subtasks":[],"links":[],"attachments":[],"updatedAt":"2026-07-28T08:00:00.000Z","updatedBy":"Minh Trần","titleKey":"deployment:template.during.g2.t0.title","descriptionKey":"deployment:template.during.g2.t0.description"},"during-g2-t1":{"id":"during-g2-t1","groupId":"during-g2","title":"Theo một đơn/lô/sản phẩm thật từ đầu đến cuối","description":"","done":false,"required":false,"needsTemplate":false,"note":"","subtasks":[],"links":[],"attachments":[],"updatedAt":"2026-07-28T08:00:00.000Z","updatedBy":"Minh Trần","titleKey":"deployment:template.during.g2.t1.title","descriptionKey":"deployment:template.during.g2.t1.description"},"during-g2-t2":{"id":"during-g2-t2","groupId":"during-g2","title":"Phỏng vấn quản lý, supervisor và operator","description":"","done":false,"required":false,"needsTemplate":false,"note":"","subtasks":[],"links":[],"attachments":[],"updatedAt":"2026-07-28T08:00:00.000Z","updatedBy":"Minh Trần","titleKey":"deployment:template.during.g2.t2.title","descriptionKey":"deployment:template.during.g2.t2.description"},"during-g2-t3":{"id":"during-g2-t3","groupId":"during-g2","title":"Ghi lại bước, người phụ trách, input, output và điểm hand-off","description":"","done":false,"required":false,"needsTemplate":false,"note":"","subtasks":[],"links":[],"attachments":[],"updatedAt":"2026-07-28T08:00:00.000Z","updatedBy":"Minh Trần","titleKey":"deployment:template.during.g2.t3.title","descriptionKey":"deployment:template.during.g2.t3.description"},"during-g2-t4":{"id":"during-g2-t4","groupId":"during-g2","title":"Xác định các điểm ra quyết định, phê duyệt và checkpoint QC","description":"","done":false,"required":false,"needsTemplate":false,"note":"","subtasks":[],"links":[],"attachments":[],"updatedAt":"2026-07-28T08:00:00.000Z","updatedBy":"Minh Trần","titleKey":"deployment:template.during.g2.t4.title","descriptionKey":"deployment:template.during.g2.t4.description"},"during-g2-t5":{"id":"during-g2-t5","groupId":"during-g2","title":"Ghi nhận ngoại lệ, độ trễ và cách làm tắt","description":"","done":false,"required":false,"needsTemplate":false,"note":"","subtasks":[],"links":[],"attachments":[],"updatedAt":"2026-07-28T08:00:00.000Z","updatedBy":"Minh Trần","titleKey":"deployment:template.during.g2.t5.title","descriptionKey":"deployment:template.during.g2.t5.description"},"during-g2-t6":{"id":"during-g2-t6","groupId":"during-g2","title":"So sánh SOP tài liệu với thực tế đang chạy","description":"","done":false,"required":false,"needsTemplate":false,"note":"","subtasks":[],"links":[],"attachments":[],"updatedAt":"2026-07-28T08:00:00.000Z","updatedBy":"Minh Trần","titleKey":"deployment:template.during.g2.t6.title","descriptionKey":"deployment:template.during.g2.t6.description"},"during-g2-t7":{"id":"during-g2-t7","groupId":"during-g2","title":"Xác nhận workflow hiện tại với khách hàng","description":"","done":false,"required":true,"needsTemplate":true,"note":"","subtasks":[],"links":[],"attachments":[],"updatedAt":"2026-07-28T08:00:00.000Z","updatedBy":"Minh Trần","titleKey":"deployment:template.during.g2.t7.title","descriptionKey":"deployment:template.during.g2.t7.description"},"during-g3-t0":{"id":"during-g3-t0","groupId":"during-g3","title":"Liệt kê hệ thống, máy móc, spreadsheet và sổ ghi tay","description":"","done":false,"required":false,"needsTemplate":false,"note":"","subtasks":[],"links":[],"attachments":[],"updatedAt":"2026-07-28T08:00:00.000Z","updatedBy":"Minh Trần","titleKey":"deployment:template.during.g3.t0.title","descriptionKey":"deployment:template.during.g3.t0.description"},"during-g3-t1":{"id":"during-g3-t1","groupId":"during-g3","title":"Liệt kê data input, output, tần suất cập nhật và chủ dữ liệu","description":"","done":false,"required":false,"needsTemplate":false,"note":"","subtasks":[],"links":[],"attachments":[],"updatedAt":"2026-07-28T08:00:00.000Z","updatedBy":"Minh Trần","titleKey":"deployment:template.during.g3.t1.title","descriptionKey":"deployment:template.during.g3.t1.description"},"during-g3-t2":{"id":"during-g3-t2","groupId":"during-g3","title":"Kiểm tra quyền truy cập, phân quyền và kết nối mạng","description":"","done":false,"required":false,"needsTemplate":false,"note":"","subtasks":[],"links":[],"attachments":[],"updatedAt":"2026-07-28T08:00:00.000Z","updatedBy":"Minh Trần","titleKey":"deployment:template.during.g3.t2.title","descriptionKey":"deployment:template.during.g3.t2.description"},"during-g3-t3":{"id":"during-g3-t3","groupId":"during-g3","title":"Tổng hợp findings","description":"","done":false,"required":false,"needsTemplate":true,"note":"","subtasks":[],"links":[],"attachments":[],"updatedAt":"2026-07-28T08:00:00.000Z","updatedBy":"Minh Trần","titleKey":"deployment:template.during.g3.t3.title","descriptionKey":"deployment:template.during.g3.t3.description"},"after-g0-t0":{"id":"after-g0-t0","groupId":"after-g0","title":"Xác nhận phạm vi đã triển khai","description":"","done":false,"required":false,"needsTemplate":false,"note":"","subtasks":[],"links":[],"attachments":[],"updatedAt":"2026-07-28T08:00:00.000Z","updatedBy":"Minh Trần","titleKey":"deployment:template.after.g0.t0.title","descriptionKey":"deployment:template.after.g0.t0.description"},"after-g0-t1":{"id":"after-g0-t1","groupId":"after-g0","title":"Chuyển giao quyền vận hành và quản trị","description":"","done":false,"required":false,"needsTemplate":false,"note":"","subtasks":[],"links":[],"attachments":[],"updatedAt":"2026-07-28T08:00:00.000Z","updatedBy":"Minh Trần","titleKey":"deployment:template.after.g0.t1.title","descriptionKey":"deployment:template.after.g0.t1.description"},"after-g0-t2":{"id":"after-g0-t2","groupId":"after-g0","title":"Chuyển giao tài liệu workflow và hệ thống","description":"","done":false,"required":false,"needsTemplate":false,"note":"","subtasks":[],"links":[],"attachments":[],"updatedAt":"2026-07-28T08:00:00.000Z","updatedBy":"Minh Trần","titleKey":"deployment:template.after.g0.t2.title","descriptionKey":"deployment:template.after.g0.t2.description"},"after-g0-t3":{"id":"after-g0-t3","groupId":"after-g0","title":"Xác nhận nghiệm thu từ khách hàng","description":"","done":false,"required":true,"needsTemplate":true,"note":"","subtasks":[],"links":[],"attachments":[],"updatedAt":"2026-07-28T08:00:00.000Z","updatedBy":"Minh Trần","titleKey":"deployment:template.after.g0.t3.title","descriptionKey":"deployment:template.after.g0.t3.description"},"after-g0-t4":{"id":"after-g0-t4","groupId":"after-g0","title":"Summary docs: profile đối tác, vấn đề, giải pháp, bài học, traction","description":"","done":false,"required":false,"needsTemplate":true,"note":"","subtasks":[{"id":"after-g0-t4-s0","title":"Profile đối tác","description":"","done":false,"titleKey":"deployment:template.after.g0.t4.title.sub0"},{"id":"after-g0-t4-s1","title":"Vấn đề & giải pháp","description":"","done":false,"titleKey":"deployment:template.after.g0.t4.title.sub1"},{"id":"after-g0-t4-s2","title":"Bài học rút ra","description":"","done":false,"titleKey":"deployment:template.after.g0.t4.title.sub2"},{"id":"after-g0-t4-s3","title":"Traction record","description":"","done":false,"titleKey":"deployment:template.after.g0.t4.title.sub3"}],"links":[],"attachments":[],"updatedAt":"2026-07-28T08:00:00.000Z","updatedBy":"Minh Trần","titleKey":"deployment:template.after.g0.t4.title","descriptionKey":"deployment:template.after.g0.t4.description"},"after-g1-t0":{"id":"after-g1-t0","groupId":"after-g1","title":"Theo dõi mức độ sử dụng và sự cố những ngày đầu","description":"","done":false,"required":false,"needsTemplate":false,"note":"","subtasks":[],"links":[],"attachments":[],"updatedAt":"2026-07-28T08:00:00.000Z","updatedBy":"Minh Trần","titleKey":"deployment:template.after.g1.t0.title","descriptionKey":"deployment:template.after.g1.t0.description"},"after-g1-t1":{"id":"after-g1-t1","groupId":"after-g1","title":"Review kết quả vận hành cùng khách hàng","description":"","done":false,"required":false,"needsTemplate":false,"note":"","subtasks":[],"links":[],"attachments":[],"updatedAt":"2026-07-28T08:00:00.000Z","updatedBy":"Minh Trần","titleKey":"deployment:template.after.g1.t1.title","descriptionKey":"deployment:template.after.g1.t1.description"},"after-g1-t2":{"id":"after-g1-t2","groupId":"after-g1","title":"Xác định cơ hội mở rộng","description":"","done":false,"required":false,"needsTemplate":false,"note":"","subtasks":[],"links":[],"attachments":[],"updatedAt":"2026-07-28T08:00:00.000Z","updatedBy":"Minh Trần","titleKey":"deployment:template.after.g1.t2.title","descriptionKey":"deployment:template.after.g1.t2.description"}}}'::jsonb)
on conflict (version) do nothing;

alter table public.fde_deployments
  add column if not exists template_version bigint;

update public.fde_deployments
set template_version = 1
where template_version is null;

alter table public.fde_deployments
  alter column template_version set default 1,
  alter column template_version set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'fde_deployments_template_version_fkey'
      and conrelid = 'public.fde_deployments'::regclass
  ) then
    alter table public.fde_deployments
      add constraint fde_deployments_template_version_fkey
      foreign key (template_version)
      references public.fde_template_versions(version);
  end if;
end $$;

alter table public.fde_template_versions enable row level security;

drop policy if exists "fde template versions readable" on public.fde_template_versions;
create policy "fde template versions readable"
  on public.fde_template_versions
  for select
  using (true);

revoke insert, update, delete on public.fde_template_versions from anon, authenticated;
grant select on public.fde_template_versions to anon, authenticated;

create or replace function public.publish_fde_template(
  expected_version bigint,
  content jsonb
)
returns public.fde_template_versions
language plpgsql
security definer
set search_path = public
as $$
declare
  current_version bigint;
  next_version bigint;
  published public.fde_template_versions;
begin
  perform pg_advisory_xact_lock(hashtext('fde-template-publish'));

  select coalesce(max(version), 0)
  into current_version
  from public.fde_template_versions;

  if current_version <> expected_version then
    raise exception 'FDE_TEMPLATE_VERSION_CONFLICT expected %, current %',
      expected_version, current_version
      using errcode = '40001';
  end if;

  if jsonb_typeof(content) <> 'object'
    or jsonb_typeof(content -> 'groups') <> 'array'
    or jsonb_typeof(content -> 'tasks') <> 'object' then
    raise exception 'FDE_TEMPLATE_INVALID';
  end if;

  next_version := current_version + 1;

  insert into public.fde_template_versions (version, content)
  values (
    next_version,
    jsonb_set(content, '{version}', to_jsonb(next_version), true)
  )
  returning * into published;

  return published;
end;
$$;

revoke all on function public.publish_fde_template(bigint, jsonb) from public;
grant execute on function public.publish_fde_template(bigint, jsonb)
  to anon, authenticated;

create or replace function public.sync_fde_deployment_template(
  deployment_id uuid,
  expected_version bigint,
  target_version bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_version bigint;
  latest_version bigint;
  template_content jsonb;
  removed_task_ids uuid[] := '{}';
  removed_external_ids text[] := '{}';
  removed_fde_paths text[] := '{}';
  removed_context_paths text[] := '{}';
  added_tasks integer := 0;
  updated_tasks integer := 0;
  removed_tasks integer := 0;
begin
  select d.template_version
  into current_version
  from public.fde_deployments d
  where d.id = sync_fde_deployment_template.deployment_id
  for update;

  if current_version is null then
    raise exception 'FDE_DEPLOYMENT_NOT_FOUND';
  end if;

  if current_version <> expected_version then
    raise exception 'FDE_DEPLOYMENT_VERSION_CONFLICT expected %, current %',
      expected_version, current_version
      using errcode = '40001';
  end if;

  select max(version)
  into latest_version
  from public.fde_template_versions;

  if target_version <> latest_version then
    raise exception 'FDE_TEMPLATE_TARGET_NOT_LATEST target %, latest %',
      target_version, latest_version
      using errcode = '40001';
  end if;

  select content
  into template_content
  from public.fde_template_versions
  where version = target_version;

  if template_content is null then
    raise exception 'FDE_TEMPLATE_NOT_FOUND %', target_version;
  end if;

  select coalesce(array_agg(t.id), '{}'), count(*)::integer
  into removed_task_ids, removed_tasks
  from public.fde_deployment_tasks t
  where t.deployment_id = sync_fde_deployment_template.deployment_id
    and not ((template_content -> 'tasks') ? t.task_key);

  if cardinality(removed_task_ids) > 0 then
    select coalesce(array_agg(distinct external_id), '{}')
    into removed_external_ids
    from (
      select id::text as external_id
      from public.fde_deployment_tasks
      where id = any(removed_task_ids)
      union all
      select id::text
      from public.fde_task_links
      where task_id = any(removed_task_ids)
      union all
      select id::text
      from public.fde_task_attachments
      where task_id = any(removed_task_ids)
    ) removed;

    select coalesce(array_agg(storage_path), '{}')
    into removed_fde_paths
    from public.fde_task_attachments
    where task_id = any(removed_task_ids)
      and storage_path <> '';

    select coalesce(array_agg(storage_path), '{}')
    into removed_context_paths
    from public.context_items
    where source = 'fde-kit'
      and external_id = any(removed_external_ids)
      and storage_path is not null
      and storage_path <> '';

    delete from public.context_items
    where source = 'fde-kit'
      and external_id = any(removed_external_ids);

    delete from public.fde_deployment_tasks
    where id = any(removed_task_ids);
  end if;

  with template_tasks as (
    select
      task.key as task_key,
      task.value as task,
      placement.group_key,
      placement.phase
    from jsonb_each(template_content -> 'tasks') as task(key, value)
    join lateral (
      select
        group_item.value ->> 'id' as group_key,
        group_item.value ->> 'phaseId' as phase
      from jsonb_array_elements(template_content -> 'groups') as group_item(value)
      where (group_item.value -> 'taskIds') ? task.key
      limit 1
    ) placement on true
  )
  select
    count(*) filter (where existing.id is null)::integer,
    count(*) filter (where existing.id is not null)::integer
  into added_tasks, updated_tasks
  from template_tasks source
  left join public.fde_deployment_tasks existing
    on existing.deployment_id = sync_fde_deployment_template.deployment_id
   and existing.task_key = source.task_key;

  with template_tasks as (
    select
      task.key as task_key,
      task.value as task,
      placement.group_key,
      placement.phase
    from jsonb_each(template_content -> 'tasks') as task(key, value)
    join lateral (
      select
        group_item.value ->> 'id' as group_key,
        group_item.value ->> 'phaseId' as phase
      from jsonb_array_elements(template_content -> 'groups') as group_item(value)
      where (group_item.value -> 'taskIds') ? task.key
      limit 1
    ) placement on true
  ),
  merged_tasks as (
    select
      source.task_key,
      source.group_key,
      source.phase,
      source.task ->> 'title' as title,
      coalesce((
        select jsonb_agg(
          jsonb_set(
            new_subtask.value,
            '{done}',
            coalesce((
              select old_subtask.value -> 'done'
              from jsonb_array_elements(coalesce(existing.subtasks, '[]'::jsonb))
                as old_subtask(value)
              where old_subtask.value ->> 'id' = new_subtask.value ->> 'id'
              limit 1
            ), 'false'::jsonb),
            true
          )
          order by new_subtask.ordinality
        )
        from jsonb_array_elements(coalesce(source.task -> 'subtasks', '[]'::jsonb))
          with ordinality as new_subtask(value, ordinality)
      ), '[]'::jsonb) as subtasks
    from template_tasks source
    left join public.fde_deployment_tasks existing
      on existing.deployment_id = sync_fde_deployment_template.deployment_id
     and existing.task_key = source.task_key
  )
  insert into public.fde_deployment_tasks (
    deployment_id,
    group_key,
    task_key,
    phase,
    title,
    note,
    status,
    subtasks,
    updated_at
  )
  select
    sync_fde_deployment_template.deployment_id,
    merged.group_key,
    merged.task_key,
    merged.phase,
    merged.title,
    '',
    'todo',
    merged.subtasks,
    now()
  from merged_tasks merged
  on conflict on constraint fde_deployment_tasks_deployment_id_task_key_key
  do update set
    group_key = excluded.group_key,
    phase = excluded.phase,
    title = excluded.title,
    subtasks = excluded.subtasks,
    updated_at = now();

  update public.fde_deployments as deployment
  set template_version = target_version,
      updated_at = now()
  where deployment.id = sync_fde_deployment_template.deployment_id;

  return jsonb_build_object(
    'version', target_version,
    'addedTasks', added_tasks,
    'updatedTasks', updated_tasks,
    'removedTasks', removed_tasks,
    'removedFdeStoragePaths', to_jsonb(removed_fde_paths),
    'removedContextStoragePaths', to_jsonb(removed_context_paths)
  );
end;
$$;

revoke all on function public.sync_fde_deployment_template(uuid, bigint, bigint)
  from public;
grant execute on function public.sync_fde_deployment_template(uuid, bigint, bigint)
  to anon, authenticated;
