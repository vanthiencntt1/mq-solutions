import { createHash } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { ContentBlocksSchema, type ContentBlocks } from '../lib/domain/content/blocks';

const prisma = new PrismaClient();
const paragraph = (text: string) => ({ type: 'paragraph' as const, content: [{ text }] });
const heading = (text: string) => ({ type: 'heading' as const, level: 2 as const, text });
const list = (items: string[], ordered = false) => ({
  type: 'list' as const,
  ordered,
  items: items.map((text) => [{ text }]),
});
const link = (label: string, href: string) => ({
  type: 'paragraph' as const,
  content: [{ text: 'Nguồn: ' }, { text: label, href }],
});

type News = {
  slug: string;
  title: string;
  excerpt: string;
  category: 'tin-y-te' | 'y-hoc-thuong-thuc';
  coverUrl: string;
  publishedAt: string;
  tags: string[];
  sourceName: string;
  sourceUrl: string;
  sections: { heading: string; paragraphs: string[] }[];
};

const news: News[] = [
  {
    slug: 'phong-benh-nao-mo-cau-trong-truong-hoc',
    title: 'Trường học tăng cường phòng bệnh não mô cầu: phụ huynh cần lưu ý gì?',
    excerpt:
      'Hoạt động truyền thông tại trường nhấn mạnh vệ sinh cá nhân, theo dõi triệu chứng và đưa trẻ đi khám sớm khi có dấu hiệu nghi ngờ.',
    category: 'tin-y-te',
    coverUrl: '/images/tin-tuc/phong-benh-nao-mo-cau-trong-truong-hoc.jpg',
    publishedAt: '2026-10-27T05:48:00.000Z',
    tags: ['não mô cầu', 'trường học', 'phòng bệnh'],
    sourceName: 'Sức khỏe & Đời sống, 27/10/2026',
    sourceUrl:
      'https://suckhoedoisong.vn/cac-truong-tai-tphcm-tang-cuong-phong-benh-nao-mo-cau-169261027113631385.htm',
    sections: [
      {
        heading: 'Thông tin phòng bệnh đến gần học sinh hơn',
        paragraphs: [
          'Cuối tháng 10/2026, nhiều trường tại TP.HCM phối hợp với trạm y tế để hướng dẫn học sinh nhận biết bệnh do não mô cầu và thực hành vệ sinh cá nhân. Hoạt động diễn ra tại lớp học, đồng thời thông tin được chuyển đến phụ huynh qua các kênh của trường. Sau khi một ổ dịch học đường được kiểm soát, việc giám sát và truyền thông vẫn tiếp tục để gia đình và nhà trường nhận ra sớm ca nghi ngờ.',
          'Não mô cầu có thể lây qua tiếp xúc gần với dịch tiết đường hô hấp. Phần lớn triệu chứng ban đầu như sốt, mệt, đau đầu dễ bị nhầm với bệnh thông thường. Vì vậy, mục tiêu của truyền thông không phải khiến học sinh hoang mang mà giúp các em biết báo ngay cho người lớn khi sức khỏe thay đổi, và giúp phụ huynh phản ứng đúng lúc.',
        ],
      },
      {
        heading: 'Những dấu hiệu cần được đánh giá sớm',
        paragraphs: [
          'Sốt kèm đau đầu dữ dội, nôn, cứng gáy, lơ mơ hoặc ban xuất huyết là những dấu hiệu cần đưa trẻ đến cơ sở y tế ngay. Không nên tự kết luận đó chỉ là cảm cúm, đặc biệt khi trẻ đã tiếp xúc gần với người mắc bệnh hoặc có thông báo giám sát tại trường. Nhân viên y tế sẽ đánh giá tình trạng, chỉ định xét nghiệm và xử trí phù hợp; gia đình không tự dùng kháng sinh dự phòng.',
        ],
      },
      {
        heading: 'Việc gia đình có thể làm hằng ngày',
        paragraphs: [
          'Cha mẹ nên nhắc trẻ rửa tay bằng xà phòng, che miệng khi ho hoặc hắt hơi, không dùng chung vật dụng cá nhân và giữ không gian học tập thông thoáng. Khi trẻ sốt hoặc có triệu chứng đường hô hấp, cho trẻ nghỉ học và liên hệ nhân viên y tế để được hướng dẫn. Phụ huynh cũng có thể kiểm tra lịch tiêm chủng và hỏi bác sĩ về loại vắc xin phù hợp với độ tuổi, tình trạng sức khỏe của con.',
          'Nếu nhận thông báo có ca bệnh ở lớp, hãy theo dõi sức khỏe theo hướng dẫn của cơ quan y tế và cung cấp thông tin tiếp xúc trung thực. Sự phối hợp giữa gia đình, trường học và trạm y tế giúp nhận diện ca bệnh sớm, hạn chế lây lan mà vẫn duy trì sinh hoạt học đường an toàn.',
        ],
      },
    ],
  },
  {
    slug: 'an-giang-tang-cuong-phong-sot-xuat-huyet',
    title: 'Sốt xuất huyết gia tăng tại An Giang: phòng muỗi từ từng hộ gia đình',
    excerpt:
      'Số ca sốt xuất huyết tăng đặt ra yêu cầu xử lý nơi muỗi sinh sản đều đặn và theo dõi sát người sốt, nhất là trẻ em.',
    category: 'tin-y-te',
    coverUrl: '/images/tin-tuc/an-giang-tang-cuong-phong-sot-xuat-huyet.png',
    publishedAt: '2026-10-16T05:01:00.000Z',
    tags: ['sốt xuất huyết', 'Dengue', 'phòng dịch'],
    sourceName: 'Sức khỏe & Đời sống, 16/10/2026',
    sourceUrl:
      'https://suckhoedoisong.vn/an-giang-ghi-nhan-hon-7000-ca-mac-sot-xuat-huyet-1-truong-hop-tu-vong-169261016114920718.htm',
    sections: [
      {
        heading: 'Số ca mắc và nguy cơ ở trẻ em',
        paragraphs: [
          'Theo thông tin công bố giữa tháng 10/2026, An Giang đã ghi nhận hơn 7.000 ca sốt xuất huyết và một trường hợp tử vong. Trong nhóm ca nhẹ hoặc có dấu hiệu cảnh báo, trẻ từ 15 tuổi trở xuống chiếm hơn một nửa; ở nhóm bệnh nặng, tỷ lệ trẻ còn cao hơn. Số mắc tăng ở nhiều địa bàn, cho thấy việc phòng dịch phải được duy trì thường xuyên ngay cả tại nơi đang ghi nhận ít ca.',
          'Sốt xuất huyết Dengue do muỗi truyền. Nguy cơ không chỉ nằm ở những ao tù dễ thấy: chậu cây, xô, khay nước và các vật dụng đọng nước quanh nhà cũng có thể trở thành chỗ muỗi sinh sản. Một đợt phun hóa chất không thể thay cho việc loại bỏ lăng quăng trước và sau xử lý ổ dịch.',
        ],
      },
      {
        heading: 'Chủ động xử lý nguồn muỗi',
        paragraphs: [
          'Mỗi gia đình nên dành thời gian kiểm tra, đậy kín dụng cụ chứa nước, thay nước bình hoa, cọ rửa thành vật chứa và loại bỏ đồ phế thải có thể tích nước mưa. Ban ngày cũng cần phòng muỗi đốt bằng quần áo che kín, lưới hoặc biện pháp xua muỗi phù hợp. Khi địa phương triển khai giám sát hoặc xử lý ổ dịch, người dân nên phối hợp để đội y tế tiếp cận đúng điểm nguy cơ.',
        ],
      },
      {
        heading: 'Theo dõi người sốt đúng cách',
        paragraphs: [
          'Người sốt cao, đau đầu, đau mỏi người, nhất là đang sống hoặc vừa đến vùng có dịch, nên đi khám để được đánh giá nguyên nhân. Cần theo dõi liên tục cả khi đã hạ sốt, vì bệnh có thể chuyển nặng ở giai đoạn sau. Đau bụng nhiều, nôn liên tục, chảy máu, li bì, tay chân lạnh hoặc khó thở là lý do phải đến cơ sở y tế ngay.',
          'Không tự truyền dịch tại nhà hay dùng thuốc không được bác sĩ chỉ định. Với trẻ nhỏ, người mang thai và người có bệnh nền, gia đình càng cần hỏi nhân viên y tế về lịch theo dõi và thời điểm tái khám. Phòng muỗi và phát hiện sớm ca nặng là hai việc bổ sung cho nhau, giúp giảm nguy cơ lây truyền lẫn biến chứng.',
        ],
      },
    ],
  },
  {
    slug: 'cum-o-tre-tang-cach-han-che-lay-trong-gia-dinh',
    title: 'Ca cúm ở trẻ tăng: cách hạn chế lây trong gia đình và trường học',
    excerpt:
      'Cúm có thể gây bệnh nặng ở nhóm dễ tổn thương; tiêm phòng, nghỉ học khi ốm, vệ sinh tay và thông khí giúp giảm chuỗi lây.',
    category: 'tin-y-te',
    coverUrl: '/images/tin-tuc/cum-o-tre-tang-cach-han-che-lay-trong-gia-dinh.jpg',
    publishedAt: '2026-10-10T02:12:00.000Z',
    tags: ['cúm mùa', 'trẻ em', 'tiêm chủng'],
    sourceName: 'Sức khỏe & Đời sống, 10/10/2026',
    sourceUrl:
      'https://suckhoedoisong.vn/tang-tre-nhap-vien-vi-cum-dung-de-mot-dot-bung-phat-tro-thanh-vong-xoay-benh-169261008104052238.htm',
    sections: [
      {
        heading: 'Khi số trẻ mắc cúm tăng nhanh',
        paragraphs: [
          'Một báo cáo được Sức khỏe & Đời sống dẫn lại cho thấy số trẻ dương tính với cúm A trong tuần 40/2026 cao hơn bảy lần so với tuần 35, trong khi số trẻ phải nhập viện tăng từ 18 lên 124. Đây là số liệu tại một cơ sở được theo dõi, không phải tỷ lệ mắc của tất cả trẻ em. Dù vậy, diễn biến này nhắc các gia đình chú ý phòng lây khi mùa bệnh thay đổi.',
          'Cúm là bệnh nhiễm virus đường hô hấp, thường gây sốt, ho, đau họng, mệt và đau nhức. Nhiều trường hợp tự hồi phục nhưng trẻ nhỏ, người cao tuổi, thai phụ và người có bệnh mạn tính có nguy cơ biến chứng cao hơn. Virus cũng có thể làm bệnh nền nặng lên hoặc tạo điều kiện cho bội nhiễm. Vì thế, theo dõi người ốm và giảm tiếp xúc gần là việc cần làm ngay từ những ngày đầu.',
        ],
      },
      {
        heading: 'Cắt đường lây tại nhà và trường',
        paragraphs: [
          'Khi trẻ bị sốt hoặc có triệu chứng cúm, nên cho trẻ nghỉ học, nghỉ ngơi và liên hệ bác sĩ nếu cần. Người chăm sóc rửa tay thường xuyên, che miệng khi ho, vệ sinh bề mặt hay chạm vào và mở cửa thông khí khi điều kiện cho phép. Hạn chế để trẻ ốm tiếp xúc gần với người lớn tuổi hoặc người có bệnh nền. Trường học cũng nên có cách thông báo và hỗ trợ học sinh nghỉ ở nhà khi đang bệnh.',
        ],
      },
      {
        heading: 'Tiêm phòng và nhận biết lúc cần đi khám',
        paragraphs: [
          'Tiêm vắc xin cúm hằng năm là biện pháp dự phòng quan trọng, nhất là ở nhóm có nguy cơ bệnh nặng. Gia đình nên hỏi nhân viên y tế về thời điểm và loại vắc xin phù hợp với từng thành viên. Vắc xin không bảo đảm tránh mọi ca nhiễm, nhưng giúp giảm nguy cơ bệnh nặng và nhập viện.',
          'Nếu người bệnh khó thở, thở nhanh, lơ mơ, mất nước, sốt kéo dài hoặc triệu chứng nặng lên sau khi đã đỡ, hãy đi khám sớm. Không tự mua kháng sinh vì thuốc này không điều trị virus cúm. Sự kết hợp giữa tiêm phòng, chăm sóc đúng cách và ở nhà khi ốm giúp bảo vệ cả gia đình lẫn cộng đồng.',
        ],
      },
    ],
  },
  {
    slug: 'nguoi-cao-tuoi-can-theo-doi-huyet-ap-dinh-ky',
    title: 'Nhiều người cao tuổi có dấu hiệu liên quan tăng huyết áp: cần theo dõi thế nào?',
    excerpt:
      'Dữ liệu khám sức khỏe tại TP.HCM gợi ý nhu cầu đo huyết áp định kỳ và đánh giá y khoa, thay vì tự kết luận từ một lần đo.',
    category: 'y-hoc-thuong-thuc',
    coverUrl: '/images/tin-tuc/nguoi-cao-tuoi-can-theo-doi-huyet-ap-dinh-ky.jpg',
    publishedAt: '2026-10-12T04:02:00.000Z',
    tags: ['tăng huyết áp', 'người cao tuổi', 'khám định kỳ'],
    sourceName: 'VnExpress Sức khỏe, 12/10/2026',
    sourceUrl: 'https://vnexpress.net/tang-huyet-ap-go-cua-nhieu-nguoi-cao-tuoi-tp-hcm-5131119.html',
    sections: [
      {
        heading: 'Hiểu đúng số liệu sàng lọc',
        paragraphs: [
          'Trong hơn 663.000 người từ 60 tuổi trở lên có dữ liệu được phân tích từ chương trình khám sức khỏe tại TP.HCM, khoảng 51% được ghi nhận thông tin liên quan đến tăng huyết áp. Nhóm thông tin này bao gồm tiền sử bệnh, huyết áp tăng tại lần khám hoặc chẩn đoán sơ bộ. Con số không có nghĩa một nửa toàn bộ người cao tuổi của thành phố đã được xác định mắc bệnh; những trường hợp nghi ngờ còn cần được đo và đánh giá thêm.',
          'Ở nhóm 18–59 tuổi, tỷ lệ có yếu tố liên quan thấp hơn nhưng vẫn đáng chú ý. Dữ liệu sàng lọc giúp cơ quan y tế nhận diện người cần theo dõi, đồng thời nhắc mỗi cá nhân rằng huyết áp cao có thể không gây triệu chứng rõ. Không nên đợi đến khi đau đầu hay mệt mới kiểm tra.',
        ],
      },
      {
        heading: 'Theo dõi huyết áp có hệ thống',
        paragraphs: [
          'Nếu từng có kết quả cao, hãy trao đổi với bác sĩ về cách đo tại nhà, thời điểm đo và việc ghi lại nhiều lần đo. Ngồi nghỉ trước khi đo, đặt tay đúng tư thế và dùng thiết bị phù hợp giúp giảm sai lệch. Bác sĩ có thể xem thêm tiền sử bệnh, thuốc đang dùng và những yếu tố nguy cơ khác để quyết định có cần xét nghiệm hay theo dõi thêm hay không.',
        ],
      },
      {
        heading: 'Kiểm soát nguy cơ lâu dài',
        paragraphs: [
          'Người đã được chẩn đoán tăng huyết áp nên dùng thuốc và tái khám theo đơn, kể cả khi thấy khỏe. Tự ngừng thuốc vì một vài lần đo bình thường có thể khiến huyết áp tăng trở lại. Bên cạnh điều trị, giảm muối, vận động phù hợp, hạn chế thuốc lá và rượu bia, ngủ đủ và kiểm soát cân nặng là những bước có ích cho sức khỏe tim mạch.',
          'Khi xuất hiện đau ngực, khó thở, yếu liệt đột ngột, nói khó hoặc đau đầu dữ dội bất thường, cần tìm trợ giúp y tế khẩn cấp. Việc kiểm tra định kỳ giúp phát hiện sớm và điều chỉnh điều trị trước khi biến chứng xảy ra; kết quả tự đo chỉ là một phần thông tin cho cuộc trao đổi với nhân viên y tế.',
        ],
      },
    ],
  },
  {
    slug: 'ho-so-suc-khoe-dien-tu-ho-tro-phat-hien-nguy-co',
    title: 'Hồ sơ sức khỏe điện tử giúp nhận diện sớm nguy cơ bệnh mạn tính',
    excerpt:
      'Phân tích dữ liệu khám sức khỏe tại TP.HCM cho thấy giá trị của sàng lọc tim mạch, thận và đường huyết khi kết hợp theo dõi sau khám.',
    category: 'tin-y-te',
    coverUrl: '/images/tin-tuc/ho-so-suc-khoe-dien-tu-ho-tro-phat-hien-nguy-co.jpg',
    publishedAt: '2026-10-10T04:00:00.000Z',
    tags: ['hồ sơ sức khỏe', 'sàng lọc', 'bệnh mạn tính'],
    sourceName: 'VnExpress Sức khỏe, 10/10/2026',
    sourceUrl:
      'https://vnexpress.net/benh-nao-pho-bien-trong-hon-5-trieu-nguoi-tp-hcm-co-ho-so-suc-khoe-5130654.html',
    sections: [
      {
        heading: 'Dữ liệu giúp nhìn thấy nhóm cần theo dõi',
        paragraphs: [
          'Đến ngày 10/10/2026, TP.HCM ghi nhận hơn 5,37 triệu người có hồ sơ sức khỏe điện tử qua chương trình khám sức khỏe cộng đồng. Phân tích bước đầu trên các hồ sơ đủ điều kiện cho thấy ở nhóm trên 40 tuổi, gần 15% được phân tầng nguy cơ tim mạch cao và 16% ở mức rất cao. Những tỷ lệ này chỉ phản ánh nhóm dữ liệu được phân tích, không phải tỷ lệ bệnh của toàn bộ dân số thành phố.',
          'Dữ liệu cũng gợi ý những vấn đề cần theo dõi về chức năng thận và đường huyết. Ở người trưởng thành chưa từng được chẩn đoán đái tháo đường, một phần kết quả đường huyết lúc đói nằm ở ngưỡng cần đánh giá thêm. Chỉ số sàng lọc là điểm khởi đầu cho tư vấn và kiểm tra tiếp, không đủ để tự xác định bệnh hay tự dùng thuốc.',
        ],
      },
      {
        heading: 'Sau khám sức khỏe nên làm gì?',
        paragraphs: [
          'Người đi khám nên lưu kết quả, hỏi nhân viên y tế chỉ số nào bất thường và có cần đo lại, làm xét nghiệm xác nhận hoặc khám chuyên khoa hay không. Với nguy cơ tim mạch, bác sĩ thường xem nhiều yếu tố cùng lúc như tuổi, huyết áp, đường huyết, mỡ máu và tiền sử. Một con số riêng lẻ khó phản ánh đầy đủ nguy cơ của từng người.',
        ],
      },
      {
        heading: 'Giá trị nằm ở theo dõi liên tục',
        paragraphs: [
          'Hồ sơ điện tử có ích khi kết quả khám mới được nối với lần khám trước và một kế hoạch theo dõi cụ thể. Nhân viên y tế có thể ưu tiên liên hệ nhóm nguy cơ cao, hướng dẫn thay đổi lối sống, nhắc tái khám và chuyển khám khi cần. Người dân cũng nên cập nhật thông tin sức khỏe chính xác để tránh hiểu sai kết quả phân tích.',
          'Khám sức khỏe định kỳ không kết thúc ở việc nhận tờ kết quả. Hãy trao đổi về mục tiêu sức khỏe phù hợp, những thay đổi khả thi trong ăn uống và vận động, cùng thời điểm kiểm tra lại. Cách làm này biến dữ liệu sàng lọc thành hành động phòng bệnh thực tế và giúp phát hiện bệnh mạn tính trước khi xuất hiện biến chứng.',
        ],
      },
    ],
  },
  {
    slug: 'nguoi-dai-thao-duong-nen-kham-mat-dinh-ky',
    title: 'Người đái tháo đường nên khám mắt định kỳ để phát hiện biến chứng sớm',
    excerpt:
      'Bệnh lý võng mạc có thể tiến triển âm thầm; khám mắt theo hẹn giúp phát hiện và điều trị trước khi thị lực giảm rõ.',
    category: 'y-hoc-thuong-thuc',
    coverUrl: '/images/tin-tuc/nguoi-dai-thao-duong-nen-kham-mat-dinh-ky.jpg',
    publishedAt: '2026-10-01T10:44:00.000Z',
    tags: ['đái tháo đường', 'mắt', 'khám định kỳ'],
    sourceName: 'Sức khỏe & Đời sống, 01/10/2026',
    sourceUrl:
      'https://suckhoedoisong.vn/vi-doi-mat-viet-quan-ly-toan-dien-phat-hien-som-bien-chung-mat-do-dai-thao-duong-169261001170716817.htm',
    sections: [
      {
        heading: 'Biến chứng mắt có thể đến âm thầm',
        paragraphs: [
          'Bệnh võng mạc và phù hoàng điểm là những biến chứng mắt quan trọng ở người đái tháo đường. Giai đoạn đầu, người bệnh có thể vẫn đọc, làm việc và sinh hoạt như thường nên không nhận thấy tổn thương đang xuất hiện. Khi thị lực giảm rõ mới đi khám, cơ hội bảo tồn thị lực có thể ít hơn. Thông tin tại một hội thảo y tế đầu tháng 10/2026 nhấn mạnh phần lớn trường hợp mất thị lực liên quan đái tháo đường có thể phòng ngừa hoặc điều trị hiệu quả nếu phát hiện sớm.',
          'Đường huyết cao kéo dài ảnh hưởng đến các mạch máu nhỏ ở võng mạc. Tuy nhiên, mức độ tổn thương mắt không thể suy ra chỉ từ cảm giác nhìn rõ hay mờ. Vì vậy, người bệnh cần được đánh giá mắt theo lịch bác sĩ chỉ định, kể cả khi chưa có triệu chứng và đang kiểm soát đường huyết tương đối tốt.',
        ],
      },
      {
        heading: 'Khám mắt là một phần của quản lý bệnh',
        paragraphs: [
          'Tài liệu được Sức khỏe & Đời sống đưa tin khuyến khích người mắc đái tháo đường hình thành thói quen khám mắt định kỳ, thường ít nhất mỗi năm một lần; thời điểm cụ thể có thể khác theo loại bệnh, tình trạng mắt và thai kỳ. Bác sĩ sẽ hướng dẫn cách kiểm tra phù hợp, như quan sát đáy mắt, và quyết định khi nào cần theo dõi sát hoặc điều trị.',
        ],
      },
      {
        heading: 'Chuẩn bị cho lần khám và theo dõi sau đó',
        paragraphs: [
          'Khi đi khám, nên mang theo kết quả đường huyết gần đây, danh sách thuốc, hồ sơ mắt cũ và ghi lại những thay đổi về thị lực. Bên cạnh khám mắt, việc kiểm soát đường huyết, huyết áp và mỡ máu theo kế hoạch điều trị giúp giảm nguy cơ biến chứng. Không tự bỏ thuốc vì thấy mắt vẫn bình thường.',
          'Nếu đột ngột nhìn mờ, thấy nhiều chấm đen mới, chớp sáng hoặc mất một phần thị trường, cần được khám sớm. Tầm soát định kỳ tạo cơ hội can thiệp trước khi thị lực suy giảm, đồng thời giúp bác sĩ nội khoa và bác sĩ mắt phối hợp theo dõi người bệnh lâu dài.',
        ],
      },
    ],
  },
];

const guides: { slug: string; title: string; blocks: ContentBlocks }[] = [
  {
    slug: 'huong-dan-quy-trinh-di-kham',
    title: 'Quy trình đi khám',
    blocks: [
      paragraph(
        'Quy trình dưới đây giúp bạn chuẩn bị cho một lần khám ngoại trú thông thường. Từng bệnh viện có thể bố trí quầy, phòng khám và giờ tiếp nhận khác nhau; hãy kiểm tra thông tin trên phiếu hẹn hoặc hỏi nhân viên hướng dẫn tại nơi khám.',
      ),
      heading('1. Đặt lịch và chuẩn bị trước khi đi'),
      paragraph(
        'Chọn cơ sở y tế, chuyên khoa, ngày và khung giờ còn nhận khám trên website. Xem lại họ tên, thông tin người bệnh, hình thức khám và phương thức thanh toán trước khi xác nhận. Lưu mã phiếu hoặc ảnh chụp màn hình để xuất trình khi đến bệnh viện.',
      ),
      list([
        'Mang CCCD hoặc giấy tờ định danh phù hợp, phiếu hẹn và hồ sơ khám cũ nếu có.',
        'Nếu khám BHYT, chuẩn bị thông tin thẻ BHYT hoặc giấy tờ có thể tra cứu BHYT, giấy chuyển cơ sở khám chữa bệnh hay giấy hẹn tái khám khi được yêu cầu.',
        'Ghi lại thuốc đang dùng, tiền sử dị ứng và các câu hỏi muốn hỏi bác sĩ. Chỉ nhịn ăn khi đã được dặn trước cho xét nghiệm hoặc thủ thuật.',
      ]),
      heading('2. Đến bệnh viện và xác nhận đăng ký'),
      paragraph(
        'Đến trước giờ hẹn theo hướng dẫn trên phiếu. Tại khu tiếp đón, xuất trình mã đặt khám và giấy tờ để nhân viên đối chiếu thông tin. Người khám BHYT cần hoàn tất bước kiểm tra quyền lợi tại quầy phù hợp; đặt lịch trực tuyến không tự động xác nhận mức hưởng BHYT.',
      ),
      heading('3. Lấy số và vào phòng khám'),
      paragraph(
        'Nhận số thứ tự hoặc phiếu phòng khám theo hướng dẫn. Theo dõi bảng gọi số và đến đúng phòng. Bác sĩ hỏi bệnh, khám lâm sàng, xem hồ sơ cũ và tư vấn bước tiếp theo. Thứ tự thực tế có thể thay đổi với trường hợp cấp cứu hoặc ưu tiên theo quy định.',
      ),
      heading('4. Thực hiện cận lâm sàng nếu có chỉ định'),
      paragraph(
        'Nếu bác sĩ chỉ định xét nghiệm, chẩn đoán hình ảnh hoặc thăm dò chức năng, hãy làm thủ tục tại quầy hoặc trên hệ thống theo hướng dẫn, thanh toán phần cần thiết rồi đến đúng khu thực hiện. Giữ phiếu chỉ định và hỏi thời gian trả kết quả. Không tự làm xét nghiệm ngoài chỉ định rồi bỏ qua bước bác sĩ đọc kết quả.',
      ),
      heading('5. Quay lại bác sĩ và thanh toán'),
      paragraph(
        'Mang kết quả trở lại phòng khám để bác sĩ kết luận, kê đơn hoặc hẹn tái khám. Sau đó, đối chiếu bảng kê và thanh toán phần chi phí còn lại tại quầy hay kênh bệnh viện hỗ trợ. Với BHYT, mức quỹ chi trả phụ thuộc điều kiện hưởng, phạm vi quyền lợi và loại dịch vụ; với khám dịch vụ, người bệnh thanh toán theo giá được thông báo.',
      ),
      heading('6. Nhận thuốc và ra về'),
      paragraph(
        'Nhận thuốc tại quầy theo hướng dẫn, kiểm tra tên thuốc, liều dùng, số lượng và cách sử dụng với dược sĩ. Giữ đơn thuốc, hóa đơn và giấy hẹn. Nếu chưa rõ dấu hiệu cần quay lại hoặc cách dùng thuốc, hãy hỏi trước khi rời bệnh viện.',
      ),
      {
        type: 'callout',
        tone: 'warning',
        title: 'Khi cần cấp cứu',
        content: [
          {
            text: 'Nếu có khó thở, đau ngực, bất tỉnh, yếu liệt đột ngột hoặc dấu hiệu nguy hiểm khác, hãy đến khu cấp cứu ngay; không chờ quy trình khám theo lịch.',
          },
        ],
      },
    ],
  },
  {
    slug: 'huong-dan-dat-lich-kham-online',
    title: 'Hướng dẫn đặt lịch khám online',
    blocks: [
      paragraph(
        'Đặt lịch trực tuyến giúp bạn chọn thời gian phù hợp và chuẩn bị hồ sơ trước khi đến viện. Lịch trống, chuyên khoa và cách nhận phiếu tùy từng cơ sở.',
      ),
      heading('Các bước đặt lịch'),
      list(
        [
          'Mở mục Đặt khám, chọn cơ sở y tế và chuyên khoa phù hợp với nhu cầu.',
          'Đăng nhập hoặc tạo tài khoản, kiểm tra thông tin người đi khám để hồ sơ khớp giấy tờ.',
          'Chọn ngày, khung giờ và hình thức khám đang được cơ sở hỗ trợ.',
          'Xem lại chi phí dự kiến, phương thức thanh toán, điều kiện hủy và xác nhận phiếu.',
          'Lưu mã phiếu, theo dõi trạng thái trong tài khoản và đến viện theo giờ hẹn.',
        ],
        true,
      ),
      paragraph(
        'Lịch hẹn được xem là hoàn tất khi hệ thống hiển thị phiếu và trạng thái tương ứng. Nếu chọn thanh toán trực tuyến, hãy chờ xác nhận giao dịch; không chuyển tiền lần thứ hai khi giao dịch trước vẫn đang xử lý. Nếu chỉ thấy lỗi hoặc chưa nhận được phiếu, kiểm tra lịch sử đặt khám trước khi thử lại.',
      ),
      heading('Khi không thấy lịch phù hợp'),
      paragraph(
        'Một số cơ sở chỉ mở lịch trong khoảng thời gian nhất định hoặc giới hạn lượt theo chuyên khoa. Bạn có thể chọn ngày khác, cơ sở khác hoặc liên hệ bộ phận hỗ trợ của cơ sở. Trường hợp triệu chứng cấp tính hoặc nguy hiểm cần được khám ngay, không chờ lịch trực tuyến.',
      ),
      { type: 'button', label: 'Bắt đầu đặt khám', href: '/dat-kham' },
    ],
  },
  {
    slug: 'huong-dan-kham-bhyt',
    title: 'Chuẩn bị khám bằng bảo hiểm y tế',
    blocks: [
      paragraph(
        'Quyền lợi BHYT phụ thuộc cơ sở khám, loại dịch vụ, giấy tờ và quy định áp dụng tại thời điểm khám. Hãy kiểm tra điều kiện với bệnh viện trước khi xác nhận lịch.',
      ),
      heading('Giấy tờ nên mang theo'),
      list([
        'CCCD hoặc giấy tờ định danh phù hợp; thẻ BHYT hay thông tin BHYT hợp lệ để tra cứu.',
        'Giấy chuyển cơ sở khám chữa bệnh, giấy hẹn khám lại hoặc giấy tờ liên quan nếu trường hợp của bạn cần.',
        'Phiếu đặt khám, hồ sơ điều trị cũ và danh sách thuốc đang dùng. Với trẻ em, mang giấy tờ của trẻ và người đưa trẻ đi khám theo hướng dẫn của cơ sở.',
      ]),
      heading('Xác nhận BHYT tại bệnh viện'),
      paragraph(
        'Dù đã đặt lịch online, bạn vẫn cần xuất trình giấy tờ để nhân viên kiểm tra thông tin và quyền lợi BHYT trước khi khám. Hỏi rõ quầy tiếp nhận, mức tạm ứng nếu có và phần dịch vụ ngoài phạm vi quỹ chi trả. Không chọn hình thức BHYT trên website nếu cơ sở hoặc hồ sơ của bạn chưa đáp ứng điều kiện hiển thị.',
      ),
      heading('Sau khi bác sĩ chỉ định dịch vụ'),
      paragraph(
        'Tại bước xét nghiệm, chẩn đoán hình ảnh và nhận thuốc, đối chiếu bảng kê phần quỹ BHYT thanh toán với phần người bệnh tự trả. Dịch vụ theo yêu cầu hoặc thuốc ngoài danh mục có thể phát sinh chi phí riêng. Nếu chưa rõ khoản thu, hãy hỏi nhân viên trước khi thanh toán.',
      ),
    ],
  },
  {
    slug: 'huong-dan-thanh-toan-vien-phi',
    title: 'Hướng dẫn thanh toán chi phí khám',
    blocks: [
      paragraph(
        'Phương thức thanh toán hiển thị khi đặt lịch phụ thuộc từng cơ sở. Một số nơi cho phép thanh toán trực tuyến; nơi khác chỉ thu tại bệnh viện.',
      ),
      heading('Trước khi xác nhận phiếu'),
      paragraph(
        'Xem chi phí dự kiến, chọn phương thức đang được hỗ trợ và kiểm tra thông tin người bệnh. Phí khám ban đầu không nhất thiết bao gồm xét nghiệm, chẩn đoán hình ảnh, thuốc hoặc dịch vụ phát sinh sau khi bác sĩ thăm khám.',
      ),
      heading('Thanh toán trực tuyến'),
      paragraph(
        'Thực hiện theo hướng dẫn trên màn hình và chỉ dùng kênh thanh toán do hệ thống cung cấp. Sau khi trả tiền, chờ phiếu chuyển sang trạng thái xác nhận. Nếu giao dịch bị treo, lưu mã giao dịch và liên hệ hỗ trợ; tránh tự ý chuyển tiền lại khi chưa kiểm tra trạng thái.',
      ),
      heading('Thanh toán tại bệnh viện'),
      paragraph(
        'Mang phiếu hẹn tới quầy tiếp đón, xác nhận thông tin rồi thanh toán theo chỉ dẫn. Với các chỉ định phát sinh, nhân viên có thể yêu cầu hoàn tất phần chi phí tương ứng trước khi thực hiện. Giữ biên lai để đối chiếu khi nhận kết quả, thuốc hoặc cần hỗ trợ sau khám.',
      ),
      heading('Chi phí BHYT'),
      paragraph(
        'Nếu sử dụng BHYT, bệnh viện kiểm tra quyền lợi trước khi chốt khoản người bệnh phải trả. Phần cùng chi trả, dịch vụ ngoài phạm vi BHYT và dịch vụ theo yêu cầu có thể được thu riêng. Hãy hỏi và xem bảng kê trước khi thanh toán.',
      ),
    ],
  },
  {
    slug: 'huong-dan-huy-lich-va-hoan-tien',
    title: 'Hủy lịch khám và xử lý hoàn tiền',
    blocks: [
      paragraph(
        'Điều kiện hủy và hoàn tiền được xác định theo chính sách của cơ sở, thời điểm khám và trạng thái phiếu. Kiểm tra điều kiện hiển thị trong chi tiết phiếu trước khi thao tác.',
      ),
      heading('Kiểm tra và yêu cầu hủy'),
      list(
        [
          'Đăng nhập tài khoản đã dùng để đặt lịch, mở lịch sử hoặc chi tiết phiếu khám.',
          'Kiểm tra mã phiếu, ngày khám, phương thức thanh toán và hạn tự hủy do cơ sở áp dụng.',
          'Nếu nút hủy còn khả dụng, gửi yêu cầu và chờ trạng thái phiếu cập nhật. Lưu lại thông báo xác nhận.',
        ],
        true,
      ),
      heading('Đổi lịch và hoàn tiền'),
      paragraph(
        'Nếu hệ thống chưa có chức năng đổi trực tiếp cho phiếu của bạn, hãy liên hệ hỗ trợ để được hướng dẫn hủy phiếu cũ và đặt phiếu mới. Không tự tạo nhiều phiếu cho cùng một lần khám khi chưa xử lý phiếu ban đầu. Với phiếu đã thanh toán, khoản hoàn và thời gian xử lý phụ thuộc điều kiện của cơ sở và kênh thanh toán; theo dõi trạng thái trong tài khoản.',
      ),
      paragraph(
        'Nếu đã quá hạn tự hủy hoặc giao dịch có dấu hiệu bất thường, hãy liên hệ bộ phận hỗ trợ và cung cấp mã phiếu, thời gian giao dịch. Tránh gửi mật khẩu, mã xác thực hoặc thông tin thẻ đầy đủ qua kênh công khai.',
      ),
    ],
  },
];

const faqs = [
  [
    'Đặt khám',
    'Tôi có thể đặt khám online như thế nào?',
    'Vào mục Đặt khám, chọn cơ sở, chuyên khoa, ngày và khung giờ, rồi nhập hoặc kiểm tra hồ sơ người bệnh. Xác nhận phiếu theo hướng dẫn trên màn hình và lưu mã đặt khám.',
  ],
  [
    'Đặt khám',
    'Đặt lịch online có thay thế việc làm thủ tục tại bệnh viện không?',
    'Bạn vẫn cần xuất trình giấy tờ và xác nhận thông tin tại khu tiếp đón theo hướng dẫn của cơ sở. Với BHYT, nhân viên còn phải kiểm tra quyền lợi trước khi khám.',
  ],
  [
    'Đặt khám',
    'Tôi có thể đặt lịch cho người thân không?',
    'Bạn có thể chọn hoặc tạo hồ sơ cho người đi khám nếu hệ thống và cơ sở hỗ trợ. Hãy nhập đúng giấy tờ, họ tên và thông tin liên hệ của người bệnh; người đi khám cần mang giấy tờ để đối chiếu.',
  ],
  [
    'Đặt khám',
    'Tôi không tìm thấy khung giờ mong muốn thì làm gì?',
    'Lịch có thể đã đủ lượt hoặc chưa được cơ sở mở. Hãy thử ngày khác, chuyên khoa hoặc cơ sở khác. Nếu tình trạng cần khám ngay, hãy liên hệ cơ sở y tế thay vì chờ lịch online.',
  ],
  [
    'Đặt khám',
    'Tôi cần đến bệnh viện trước giờ hẹn bao lâu?',
    'Hãy xem hướng dẫn trên phiếu hẹn của cơ sở và dành thêm thời gian cho việc đi lại, xác nhận hồ sơ, lấy số. Người khám BHYT có thể cần thêm thời gian kiểm tra giấy tờ.',
  ],
  [
    'Lịch hẹn',
    'Tôi có thể hủy lịch khám đã đặt không?',
    'Mở chi tiết phiếu trong tài khoản để kiểm tra hạn tự hủy và trạng thái. Nếu còn đủ điều kiện, dùng chức năng hủy và lưu thông báo xác nhận. Khi đã quá hạn, hãy liên hệ hỗ trợ của cơ sở.',
  ],
  [
    'Lịch hẹn',
    'Tôi muốn đổi ngày hoặc giờ khám thì làm thế nào?',
    'Kiểm tra chi tiết phiếu để xem cơ sở có hỗ trợ đổi trực tiếp hay không. Nếu không, liên hệ hỗ trợ để được hướng dẫn xử lý phiếu cũ và đặt lịch mới; chính sách áp dụng có thể khác nhau.',
  ],
  [
    'BHYT',
    'Tôi cần mang giấy tờ gì khi khám BHYT?',
    'Mang giấy tờ định danh, thông tin thẻ BHYT hợp lệ và giấy chuyển cơ sở khám chữa bệnh hoặc giấy hẹn khám lại khi trường hợp của bạn cần. Nên mang phiếu hẹn và hồ sơ khám cũ nếu có.',
  ],
  [
    'BHYT',
    'Đặt khám online có bảo đảm được hưởng BHYT không?',
    'Không. Bệnh viện sẽ kiểm tra điều kiện hưởng, giấy tờ, tuyến khám và phạm vi dịch vụ tại quầy. Một số cơ sở hoặc loại lịch không hỗ trợ chọn BHYT trực tuyến.',
  ],
  [
    'Chi phí',
    'Tôi có thể thanh toán bằng những cách nào?',
    'Các lựa chọn hiển thị tại bước xác nhận phụ thuộc từng cơ sở, có thể gồm thanh toán trực tuyến hoặc tại bệnh viện. Chỉ thanh toán theo hướng dẫn chính thức trên phiếu và giữ mã giao dịch, biên lai.',
  ],
  [
    'Chi phí',
    'Phí khám đã bao gồm xét nghiệm và thuốc chưa?',
    'Thông thường chi phí ban đầu chỉ phản ánh dịch vụ đã chọn khi đặt lịch. Xét nghiệm, chẩn đoán hình ảnh, thuốc và dịch vụ khác theo chỉ định có thể phát sinh thêm. Hãy xem bảng kê trước khi thanh toán.',
  ],
  [
    'Chi phí',
    'Khi hủy phiếu đã thanh toán, tôi nhận hoàn tiền thế nào?',
    'Khoản hoàn phụ thuộc chính sách của cơ sở, thời điểm hủy và trạng thái giao dịch. Theo dõi tiến trình trong chi tiết phiếu; nếu quá thời gian được thông báo, liên hệ hỗ trợ với mã phiếu và mã giao dịch.',
  ],
  [
    'Đi khám',
    'Bệnh viện làm việc vào những ngày, giờ nào?',
    'Mỗi cơ sở và chuyên khoa có giờ khám riêng. Xem trang thông tin cơ sở và lịch trống khi đặt khám. Khoa cấp cứu có quy trình tiếp nhận riêng; đừng dùng giờ khám ngoại trú để quyết định khi cần cấp cứu.',
  ],
  [
    'Đi khám',
    'Tôi nên mang theo gì trong lần khám đầu tiên?',
    'Mang giấy tờ định danh, phiếu hẹn, thẻ hoặc thông tin BHYT nếu dùng, kết quả xét nghiệm và đơn thuốc cũ. Ghi lại triệu chứng, thuốc đang dùng, dị ứng và những câu hỏi muốn trao đổi với bác sĩ.',
  ],
] as const;

function faqId(question: string): string {
  const hash = createHash('sha256').update(`mq-solutions:content-faq:${question}`).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

async function main() {
  const categorySlugs = ['tin-y-te', 'y-hoc-thuong-thuc'];
  const before = {
    categories: await prisma.postCategory.count({ where: { slug: { in: categorySlugs } } }),
    posts: await prisma.post.count({ where: { slug: { in: news.map((item) => item.slug) } } }),
    pages: await prisma.staticPage.count({ where: { slug: { in: guides.map((item) => item.slug) } } }),
    faqs: await prisma.faqItem.count({ where: { question: { in: faqs.map((item) => item[1]) } } }),
  };
  const editor = await prisma.adminUser.findFirst({ orderBy: { createdAt: 'asc' }, select: { id: true } });
  // createdBy là UUID không có foreign key; dùng UUID hệ thống nếu chưa seed admin.
  const createdBy = editor?.id ?? '00000000-0000-4000-8000-000000000001';

  const categories = new Map<string, string>();
  for (const item of [
    { slug: 'tin-y-te', name: 'Tin y tế', sortOrder: 1 },
    { slug: 'y-hoc-thuong-thuc', name: 'Y học thường thức', sortOrder: 2 },
  ]) {
    const category = await prisma.postCategory.upsert({
      where: { slug: item.slug },
      update: { name: item.name, sortOrder: item.sortOrder },
      create: item,
    });
    categories.set(item.slug, category.id);
  }

  for (const item of news) {
    const blocks = ContentBlocksSchema.parse([
      ...item.sections.flatMap((section) => [heading(section.heading), ...section.paragraphs.map(paragraph)]),
      link(item.sourceName, item.sourceUrl),
    ]);
    const bodyWordCount = item.sections
      .flatMap((section) => section.paragraphs)
      .join(' ')
      .trim()
      .split(/\s+/u).length;
    if (bodyWordCount < 300 || bodyWordCount > 600)
      throw new Error(`Bài ${item.slug} có ${bodyWordCount} từ, cần 300–600 từ`);
    const data = {
      title: item.title,
      excerpt: item.excerpt,
      coverUrl: item.coverUrl,
      contentJson: blocks,
      categoryId: categories.get(item.category)!,
      tags: item.tags,
      facilityIds: [] as string[],
      specialtyTags: [] as string[],
      authorName: 'Ban biên tập MQ Solutions',
      status: 'PUBLISHED' as const,
      publishedAt: new Date(item.publishedAt),
      seoTitle: item.title,
      seoDesc: item.excerpt,
    };
    await prisma.post.upsert({
      where: { slug: item.slug },
      update: data,
      create: { slug: item.slug, ...data, createdBy },
    });
  }

  for (const guide of guides) {
    const data = {
      title: guide.title,
      contentJson: ContentBlocksSchema.parse(guide.blocks),
      version: '2026-10',
      effectiveAt: new Date('2026-10-28T00:00:00.000Z'),
      status: 'PUBLISHED' as const,
    };
    await prisma.staticPage.upsert({
      where: { slug: guide.slug },
      update: data,
      create: { slug: guide.slug, ...data },
    });
  }

  for (const [groupName, question, answer] of faqs) {
    const existing = await prisma.faqItem.findFirst({ where: { question }, select: { id: true } });
    const id = existing?.id ?? faqId(question);
    const data = {
      groupName,
      question,
      answer: ContentBlocksSchema.parse([paragraph(answer)]),
      sortOrder: faqs.filter((faq) => faq[0] === groupName).findIndex((faq) => faq[1] === question) + 1,
      active: true,
    };
    await prisma.faqItem.upsert({ where: { id }, update: data, create: { id, ...data } });
  }

  const after = {
    categories: await prisma.postCategory.count({ where: { slug: { in: categorySlugs } } }),
    posts: await prisma.post.count({ where: { slug: { in: news.map((item) => item.slug) } } }),
    pages: await prisma.staticPage.count({ where: { slug: { in: guides.map((item) => item.slug) } } }),
    faqs: await prisma.faqItem.count({ where: { question: { in: faqs.map((item) => item[1]) } } }),
  };
  console.log(
    '[seed-content] Bản ghi mới:',
    Object.fromEntries(
      Object.keys(after).map((key) => [
        key,
        after[key as keyof typeof after] - before[key as keyof typeof before],
      ]),
    ),
  );
  console.log('[seed-content] Tổng nội dung quản lý:', after);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
