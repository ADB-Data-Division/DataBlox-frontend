import { CoastalProvince } from '@/types/coastal';
export type { CoastalProvince };

export type ProvinceOrPortSelection =
  | { type: 'province'; province: CoastalProvince }
  | { type: 'port'; aoiId: string; name: string };

const THA_PROVINCES: CoastalProvince[] = [
  {
    "name": "Ang Thong",
    "country_iso": "THA",
    "aois": [
      "THA_chaiyo_10km_78",
      "THA_pa-mok_10km_53"
    ],
    "aoi_count": 2,
    "total_hexagons": 24
  },
  {
    "name": "Bangkok",
    "country_iso": "THA",
    "aois": [
      "THA_bang-bon_10km_45",
      "THA_bang-kapi_10km_33",
      "THA_bang-khae-nuea_10km_41",
      "THA_bang-khae-nuea_10km_42",
      "THA_hua-mak_10km_27",
      "THA_hua-mak_10km_28",
      "THA_huai-khwang_10km_31",
      "THA_khan-na-yao_10km_43",
      "THA_khlong-chak-phra_10km_34",
      "THA_khlong-kum_10km_35",
      "THA_khlong-kum_10km_37",
      "THA_khlong-toei-nuea_10km_40",
      "THA_makkasan_10km_38",
      "THA_min-buri_10km_29",
      "THA_suan-chitlada_10km_26",
      "THA_wat-tha-phra_10km_30"
    ],
    "aoi_count": 16,
    "total_hexagons": 17
  },
  {
    "name": "Bueng Kan",
    "country_iso": "THA",
    "aois": [
      "THA_ban-tong_10km_92",
      "THA_wisit_10km_86"
    ],
    "aoi_count": 2,
    "total_hexagons": 15
  },
  {
    "name": "Chachoengsao",
    "country_iso": "THA",
    "aois": [
      "THA_bang-pakong_10km_106"
    ],
    "aoi_count": 1,
    "total_hexagons": 33
  },
  {
    "name": "Chiang Mai",
    "country_iso": "THA",
    "aois": [
      "THA_tha-ton_10km_91"
    ],
    "aoi_count": 1,
    "total_hexagons": 1
  },
  {
    "name": "Chiang Rai",
    "country_iso": "THA",
    "aois": [
      "THA_rim-kok_10km_84",
      "THA_wiang_10km_68",
      "THA_wiang_10km_95"
    ],
    "aoi_count": 3,
    "total_hexagons": 47
  },
  {
    "name": "Chon Buri",
    "country_iso": "THA",
    "aois": [
      "THA_na-kluea_10km_76"
    ],
    "aoi_count": 1,
    "total_hexagons": 573
  },
  {
    "name": "Chumphon",
    "country_iso": "THA",
    "aois": [
      "THA_chum-kho_10km_94",
      "THA_pak-nam_10km_56",
      "THA_tha-yang_10km_57"
    ],
    "aoi_count": 3,
    "total_hexagons": 82
  },
  {
    "name": "Kalasin",
    "country_iso": "THA",
    "aois": [
      "THA_samran-tai_10km_67"
    ],
    "aoi_count": 1,
    "total_hexagons": 41
  },
  {
    "name": "Kanchanaburi",
    "country_iso": "THA",
    "aois": [
      "THA_dan-mae-chalaep_10km_60"
    ],
    "aoi_count": 1,
    "total_hexagons": 59
  },
  {
    "name": "Krabi",
    "country_iso": "THA",
    "aois": [
      "THA_ao-luek-nuea_10km_74",
      "THA_ao-nang_10km_66",
      "THA_kantang-tai_10km_24",
      "THA_krabi-yai_10km_20"
    ],
    "aoi_count": 4,
    "total_hexagons": 1214
  },
  {
    "name": "Loei",
    "country_iso": "THA",
    "aois": [
      "THA_chiang-khan_10km_85",
      "THA_pak-chom_10km_98"
    ],
    "aoi_count": 2,
    "total_hexagons": 36
  },
  {
    "name": "Mukdahan",
    "country_iso": "THA",
    "aois": [
      "THA_na-si-nuan_10km_80"
    ],
    "aoi_count": 1,
    "total_hexagons": 18
  },
  {
    "name": "Nakhon Phanom",
    "country_iso": "THA",
    "aois": [
      "THA_nai-mueang_10km_81",
      "THA_nam-kam_10km_96"
    ],
    "aoi_count": 2,
    "total_hexagons": 33
  },
  {
    "name": "Nakhon Si Thammarat",
    "country_iso": "THA",
    "aois": [
      "THA_khanom_10km_103"
    ],
    "aoi_count": 1,
    "total_hexagons": 49
  },
  {
    "name": "Nan",
    "country_iso": "THA",
    "aois": [
      "THA_na-thanung_10km_65"
    ],
    "aoi_count": 1,
    "total_hexagons": 16
  },
  {
    "name": "Narathiwat",
    "country_iso": "THA",
    "aois": [
      "THA_che-he_10km_75"
    ],
    "aoi_count": 1,
    "total_hexagons": 43
  },
  {
    "name": "Nong Khai",
    "country_iso": "THA",
    "aois": [
      "THA_kuan-wan_10km_99",
      "THA_phan-phrao_10km_88"
    ],
    "aoi_count": 2,
    "total_hexagons": 35
  },
  {
    "name": "Pathum Thani",
    "country_iso": "THA",
    "aois": [
      "THA_khu-khot_10km_47"
    ],
    "aoi_count": 1,
    "total_hexagons": 1
  },
  {
    "name": "Pattani",
    "country_iso": "THA",
    "aois": [
      "THA_laem-pho_10km_104"
    ],
    "aoi_count": 1,
    "total_hexagons": 60
  },
  {
    "name": "Phangnga",
    "country_iso": "THA",
    "aois": [
      "THA_bang-nai-si_10km_59",
      "THA_bang-wan_10km_101",
      "THA_lam-kaen_10km_100",
      "THA_mae-nang-khao_10km_69"
    ],
    "aoi_count": 4,
    "total_hexagons": 135
  },
  {
    "name": "Phayao",
    "country_iso": "THA",
    "aois": [
      "THA_ban-sang_10km_93"
    ],
    "aoi_count": 1,
    "total_hexagons": 9
  },
  {
    "name": "Phetchaburi",
    "country_iso": "THA",
    "aois": [
      "THA_pak-thale_10km_105"
    ],
    "aoi_count": 1,
    "total_hexagons": 67
  },
  {
    "name": "Phra Nakhon Si Ayutthaya",
    "country_iso": "THA",
    "aois": [
      "THA_ho-rattana-chai_10km_50",
      "THA_ratchakhram_10km_52"
    ],
    "aoi_count": 2,
    "total_hexagons": 24
  },
  {
    "name": "Prachuap Khiri Khan",
    "country_iso": "THA",
    "aois": [
      "THA_pak-phraek_10km_55",
      "THA_prachuap-khiri-khan_10km_87"
    ],
    "aoi_count": 2,
    "total_hexagons": 133
  },
  {
    "name": "Ranong",
    "country_iso": "THA",
    "aois": [
      "THA_pak-nam_10km_71"
    ],
    "aoi_count": 1,
    "total_hexagons": 159
  },
  {
    "name": "Samut Prakan",
    "country_iso": "THA",
    "aois": [
      "THA_bang-pu-mai_10km_107",
      "THA_na-kluea_10km_46"
    ],
    "aoi_count": 2,
    "total_hexagons": 174
  },
  {
    "name": "Samut Sakhon",
    "country_iso": "THA",
    "aois": [
      "THA_khok-kham_10km_49"
    ],
    "aoi_count": 1,
    "total_hexagons": 36
  },
  {
    "name": "Samut Songkhram",
    "country_iso": "THA",
    "aois": [
      "THA_laem-yai_10km_62"
    ],
    "aoi_count": 1,
    "total_hexagons": 47
  },
  {
    "name": "Satun",
    "country_iso": "THA",
    "aois": [
      "THA_ko-sarai_10km_61",
      "THA_laem-son_10km_97",
      "THA_puyu_10km_79"
    ],
    "aoi_count": 3,
    "total_hexagons": 238
  },
  {
    "name": "Songkhla",
    "country_iso": "THA",
    "aois": [
      "THA_ko-yo_10km_83"
    ],
    "aoi_count": 1,
    "total_hexagons": 103
  },
  {
    "name": "Surat Thani",
    "country_iso": "THA",
    "aois": [
      "THA_ang-thong_10km_108",
      "THA_don-sak_10km_63",
      "THA_khao-phang_10km_73",
      "THA_khlong-chanak_10km_72",
      "THA_ko-tao_10km_89",
      "THA_taling-ngam_10km_58",
      "THA_tha-chana_10km_109"
    ],
    "aoi_count": 7,
    "total_hexagons": 475
  },
  {
    "name": "Tak",
    "country_iso": "THA",
    "aois": [
      "THA_mae-charao_10km_1",
      "THA_mae-charao_10km_2",
      "THA_mae-charao_10km_3",
      "THA_mae-kasa_10km_9",
      "THA_mae-klong_10km_90",
      "THA_mae-ku_10km_4",
      "THA_mae-ku_10km_6",
      "THA_tha-sai-luat_10km_14",
      "THA_tha-sai-luat_10km_15",
      "THA_tha-sai-luat_10km_17",
      "THA_tha-sai-luat_10km_18"
    ],
    "aoi_count": 11,
    "total_hexagons": 11
  },
  {
    "name": "Trang",
    "country_iso": "THA",
    "aois": [
      "THA_tase_10km_102"
    ],
    "aoi_count": 1,
    "total_hexagons": 77
  },
  {
    "name": "Trat",
    "country_iso": "THA",
    "aois": [
      "THA_noen-sai_10km_19"
    ],
    "aoi_count": 1,
    "total_hexagons": 428
  },
  {
    "name": "Uthai Thani",
    "country_iso": "THA",
    "aois": [
      "THA_nam-suem_10km_77"
    ],
    "aoi_count": 1,
    "total_hexagons": 4
  },
  {
    "name": "Uttaradit",
    "country_iso": "THA",
    "aois": [
      "THA_nang-phaya_10km_64"
    ],
    "aoi_count": 1,
    "total_hexagons": 33
  }
];

const IDN_PROVINCES: CoastalProvince[] = [
  {
    "name": "Aceh",
    "country_iso": "IDN",
    "aois": [
      "IDN_dewantara_10km_488",
      "IDN_idi-rayeuk_10km_526",
      "IDN_jeunieb_10km_544",
      "IDN_kuala-batee_10km_456",
      "IDN_labuhan-haji-barat_10km_35",
      "IDN_langsa-timur_10km_542",
      "IDN_madat_10km_523",
      "IDN_mesjid-raya_10km_551",
      "IDN_pulau-banyak-barat_10km_36",
      "IDN_pulau-banyak_10km_169",
      "IDN_setia-bakti_10km_457",
      "IDN_simeulue-timur_10km_458",
      "IDN_simpang-jernih_10km_229",
      "IDN_simpang-jernih_10km_230",
      "IDN_singkil_10km_165",
      "IDN_sukakarya_10km_107",
      "IDN_syiah-kuala_10km_114",
      "IDN_tapak-tuan_10km_38",
      "IDN_ulim_10km_545"
    ],
    "aoi_count": 19,
    "total_hexagons": 890
  },
  {
    "name": "Bali",
    "country_iso": "IDN",
    "aois": [
      "IDN_denpasar-selatan_10km_73",
      "IDN_gerokgak_10km_13",
      "IDN_gerokgak_10km_498",
      "IDN_karangasem_10km_16",
      "IDN_negara_10km_555"
    ],
    "aoi_count": 5,
    "total_hexagons": 528
  },
  {
    "name": "Banten",
    "country_iso": "IDN",
    "aois": [
      "IDN_bayah_10km_516",
      "IDN_kronjo_10km_570",
      "IDN_labuan_10km_538",
      "IDN_pontang_10km_10",
      "IDN_sumur_10km_446"
    ],
    "aoi_count": 5,
    "total_hexagons": 634
  },
  {
    "name": "Bengkulu",
    "country_iso": "IDN",
    "aois": [
      "IDN_enggano_10km_52",
      "IDN_kampung-melayu_10km_296",
      "IDN_kaur-selatan_10km_295",
      "IDN_teramang-jaya_10km_178"
    ],
    "aoi_count": 4,
    "total_hexagons": 224
  },
  {
    "name": "Daerah Istimewa Yogyakarta",
    "country_iso": "IDN",
    "aois": [
      "IDN_girisubo_10km_559",
      "IDN_patuk_10km_260"
    ],
    "aoi_count": 2,
    "total_hexagons": 44
  },
  {
    "name": "Dki Jakarta",
    "country_iso": "IDN",
    "aois": [
      "IDN_kepulauan-seribu-utara_10km_375",
      "IDN_kepulauan-seribu-utara_10km_485",
      "IDN_kepulauan-seribu-utara_10km_591",
      "IDN_koja_10km_402",
      "IDN_muara-gembong_10km_404"
    ],
    "aoi_count": 5,
    "total_hexagons": 571
  },
  {
    "name": "Gorontalo",
    "country_iso": "IDN",
    "aois": [
      "IDN_anggrek_10km_548",
      "IDN_batudaa-pantai_10km_420",
      "IDN_paguat_10km_336",
      "IDN_wanggarasi_10km_566"
    ],
    "aoi_count": 4,
    "total_hexagons": 153
  },
  {
    "name": "Jambi",
    "country_iso": "IDN",
    "aois": [
      "IDN_kuala-betara_10km_32",
      "IDN_kuala-betara_10km_33",
      "IDN_kumpeh_10km_53",
      "IDN_mendahara_10km_30",
      "IDN_nipah-panjang_10km_408",
      "IDN_pemayung_10km_101",
      "IDN_seberang-kota_10km_31",
      "IDN_senyerang_10km_406",
      "IDN_senyerang_10km_407",
      "IDN_sumay_10km_261",
      "IDN_taman-rajo_10km_534",
      "IDN_tebo-ilir_10km_102"
    ],
    "aoi_count": 12,
    "total_hexagons": 333
  },
  {
    "name": "Jawa Barat",
    "country_iso": "IDN",
    "aois": [
      "IDN_blanakan_10km_518",
      "IDN_blanakan_10km_519",
      "IDN_cantigi_10km_584",
      "IDN_cibuaya_10km_574",
      "IDN_cikampek_10km_314",
      "IDN_cikelet_10km_520",
      "IDN_cipatujah_10km_560",
      "IDN_kalipucang_10km_472",
      "IDN_kandanghaur_10km_481",
      "IDN_karawang-barat_10km_234",
      "IDN_legonkulon_10km_580",
      "IDN_losari_10km_490",
      "IDN_muara-gembong_10km_583",
      "IDN_pakisjaya_10km_403",
      "IDN_palabuhanratu_10km_552",
      "IDN_pangenan_10km_491",
      "IDN_panjalu_10km_440",
      "IDN_pasekan_10km_267",
      "IDN_surade_10km_572",
      "IDN_tempuran_10km_521"
    ],
    "aoi_count": 20,
    "total_hexagons": 995
  },
  {
    "name": "Jawa Tengah",
    "country_iso": "IDN",
    "aois": [
      "IDN_brebes_10km_493",
      "IDN_cilacap-tengah_10km_499",
      "IDN_donorojo_10km_442",
      "IDN_juwana_10km_514",
      "IDN_kaliori_10km_475",
      "IDN_kampung-laut_10km_473",
      "IDN_karimunjawa_10km_180",
      "IDN_karimunjawa_10km_68",
      "IDN_lakbok_10km_8",
      "IDN_mlonggo_10km_459",
      "IDN_rowosari_10km_199",
      "IDN_rowosari_10km_200",
      "IDN_sarang_10km_546",
      "IDN_sayung_10km_247",
      "IDN_taman_10km_509",
      "IDN_ulujami_10km_495",
      "IDN_wanareja_10km_9"
    ],
    "aoi_count": 17,
    "total_hexagons": 1059
  },
  {
    "name": "Jawa Timur",
    "country_iso": "IDN",
    "aois": [
      "IDN_baureno_10km_146",
      "IDN_gapura_10km_541",
      "IDN_genteng_10km_209",
      "IDN_jangkar_10km_461",
      "IDN_jenu_10km_565",
      "IDN_kangayan_10km_315",
      "IDN_kebonagung_10km_563",
      "IDN_ketapang_10km_590",
      "IDN_krembangan_10km_212",
      "IDN_lekok_10km_550",
      "IDN_mangaran_10km_497",
      "IDN_manyar_10km_208",
      "IDN_muncar_10km_568",
      "IDN_ngadiluwih_10km_238",
      "IDN_paiton_10km_530",
      "IDN_panggul_10km_561",
      "IDN_pesanggaran_10km_474",
      "IDN_sampang_10km_196",
      "IDN_sangkapura_10km_432",
      "IDN_sepulu_10km_575",
      "IDN_sepulu_10km_589",
      "IDN_sumberasih_10km_1",
      "IDN_sumbermanjing_10km_556",
      "IDN_watulimo_10km_467",
      "IDN_wuluhan_10km_557"
    ],
    "aoi_count": 25,
    "total_hexagons": 1855
  },
  {
    "name": "Kalimantan Barat",
    "country_iso": "IDN",
    "aois": [
      "IDN_delta-pawan_10km_454",
      "IDN_kendawangan_10km_539",
      "IDN_kendawangan_10km_585",
      "IDN_kepulauan-karimata_10km_159",
      "IDN_kubu_10km_160",
      "IDN_kubu_10km_441",
      "IDN_meliau_10km_282",
      "IDN_paloh_10km_332",
      "IDN_paloh_10km_416",
      "IDN_sebawi_10km_27",
      "IDN_sebawi_10km_28",
      "IDN_sekadau-hilir_10km_347",
      "IDN_seponti_10km_353",
      "IDN_sukadana_10km_259",
      "IDN_sungai-raya_10km_78",
      "IDN_tayan-hilir_10km_283",
      "IDN_tayan-hilir_10km_284",
      "IDN_teluk-batang_10km_158",
      "IDN_teluk-keramat_10km_29"
    ],
    "aoi_count": 19,
    "total_hexagons": 822
  },
  {
    "name": "Kalimantan Selatan",
    "country_iso": "IDN",
    "aois": [
      "IDN_aranio_10km_275",
      "IDN_aranio_10km_277",
      "IDN_landasan-ulin_10km_257",
      "IDN_martapura-barat_10km_256",
      "IDN_pulau-laut-kepulauan_10km_206",
      "IDN_sampanahan_10km_503",
      "IDN_satui_10km_531",
      "IDN_simpang-empat_10km_42",
      "IDN_sungai-loban_10km_587",
      "IDN_tabunganen_10km_37",
      "IDN_takisung_10km_466",
      "IDN_takisung_10km_581"
    ],
    "aoi_count": 12,
    "total_hexagons": 1091
  },
  {
    "name": "Kalimantan Tengah",
    "country_iso": "IDN",
    "aois": [
      "IDN_arut-selatan_10km_280",
      "IDN_arut-selatan_10km_577",
      "IDN_bukit-santuai_10km_255",
      "IDN_jenamas_10km_540",
      "IDN_kahayan-hilir_10km_168",
      "IDN_kapuas-barat_10km_167",
      "IDN_kapuas-kuala_10km_414",
      "IDN_karau-kuala_10km_424",
      "IDN_kota-besi_10km_524",
      "IDN_kumai_10km_281",
      "IDN_marikit_10km_106",
      "IDN_mihing-raya_10km_233",
      "IDN_permata-intan_10km_479",
      "IDN_rungan_10km_71",
      "IDN_sanaman-mantikei_10km_349",
      "IDN_selat_10km_258",
      "IDN_sepang_10km_231",
      "IDN_sepang_10km_232",
      "IDN_seranau_10km_242",
      "IDN_seribu-riam_10km_351",
      "IDN_teluk-sampit_10km_579",
      "IDN_tewah_10km_326",
      "IDN_timpah_10km_265",
      "IDN_timpah_10km_266"
    ],
    "aoi_count": 24,
    "total_hexagons": 444
  },
  {
    "name": "Kalimantan Timur",
    "country_iso": "IDN",
    "aois": [
      "IDN_anggana_10km_325",
      "IDN_babulu_10km_510",
      "IDN_babulu_10km_582",
      "IDN_balikpapan-barat_10km_215",
      "IDN_bengalon_10km_335",
      "IDN_bengalon_10km_501",
      "IDN_gunung-tabur_10km_482",
      "IDN_kotabangun_10km_241",
      "IDN_kuaro_10km_504",
      "IDN_long-bagun_10km_465",
      "IDN_long-pahangai_10km_471",
      "IDN_melak_10km_352",
      "IDN_muara-wahau_10km_338",
      "IDN_nyuatan_10km_122",
      "IDN_sangkulirang_10km_334",
      "IDN_sangkulirang_10km_502",
      "IDN_segah_10km_318",
      "IDN_tabalar_10km_586",
      "IDN_tabang_10km_339",
      "IDN_tering_10km_348"
    ],
    "aoi_count": 20,
    "total_hexagons": 2306
  },
  {
    "name": "Kalimantan Utara",
    "country_iso": "IDN",
    "aois": [
      "IDN_bunyu_10km_500",
      "IDN_malinau-kota_10km_411",
      "IDN_malinau-selatan-hilir_10km_304",
      "IDN_pujungan_10km_489",
      "IDN_sebatik-timur_10km_126",
      "IDN_sebatik-timur_10km_417",
      "IDN_sei-menggaris_10km_125",
      "IDN_sei-menggaris_10km_297",
      "IDN_sekatak_10km_104",
      "IDN_sesayap_10km_455",
      "IDN_tanjung-palas-tengah_10km_298",
      "IDN_tanjung-palas_10km_391"
    ],
    "aoi_count": 12,
    "total_hexagons": 718
  },
  {
    "name": "Kepulauan Bangka Belitung",
    "country_iso": "IDN",
    "aois": [
      "IDN_belinyu_10km_91",
      "IDN_belinyu_10km_92",
      "IDN_bukit-intan_10km_70",
      "IDN_damar_10km_120",
      "IDN_damar_10km_569",
      "IDN_lepar-pongok_10km_119",
      "IDN_merawang_10km_69",
      "IDN_sungai-liat_10km_562",
      "IDN_tanjung-pandan_10km_56",
      "IDN_toboali_10km_483"
    ],
    "aoi_count": 10,
    "total_hexagons": 476
  },
  {
    "name": "Kepulauan Riau",
    "country_iso": "IDN",
    "aois": [
      "IDN_bintan-pesisir_10km_46",
      "IDN_bunguran-timur_10km_157",
      "IDN_bunguran-utara_10km_161",
      "IDN_jemaja-timur_10km_155",
      "IDN_jemaja_10km_154",
      "IDN_nongsa_10km_17",
      "IDN_palmatak_10km_124",
      "IDN_pulau-laut_10km_449",
      "IDN_pulau-tiga_10km_162",
      "IDN_selayar_10km_274",
      "IDN_serasan_10km_174",
      "IDN_singkep_10km_354",
      "IDN_suak-midai_10km_447",
      "IDN_subi_10km_175",
      "IDN_subi_10km_450",
      "IDN_tambelan_10km_118",
      "IDN_teluk-sebong_10km_476",
      "IDN_teluk-sebong_10km_588",
      "IDN_ungar_10km_12"
    ],
    "aoi_count": 19,
    "total_hexagons": 2225
  },
  {
    "name": "Lampung",
    "country_iso": "IDN",
    "aois": [
      "IDN_cukuh-balak_10km_43",
      "IDN_dente-teladas_10km_316",
      "IDN_katibung_10km_486",
      "IDN_labuhan-maringgai_10km_549",
      "IDN_rawajitu-timur_10km_253"
    ],
    "aoi_count": 5,
    "total_hexagons": 322
  },
  {
    "name": "Maluku",
    "country_iso": "IDN",
    "aois": [
      "IDN_air-buaya_10km_430",
      "IDN_alor-timur_10km_271",
      "IDN_amahai_10km_396",
      "IDN_ambalau_10km_410",
      "IDN_aru-tengah-selatan_10km_576",
      "IDN_banda_10km_76",
      "IDN_bula_10km_397",
      "IDN_damer_10km_395",
      "IDN_kei-besar-utara-timur_10km_388",
      "IDN_kei-besar_10km_4",
      "IDN_kepala-madan_10km_412",
      "IDN_kisar-utara_10km_63",
      "IDN_kur-selatan_10km_453",
      "IDN_lakor_10km_108",
      "IDN_leihitu_10km_172",
      "IDN_leksula_10km_183",
      "IDN_moa_10km_62",
      "IDN_namrole_10km_409",
      "IDN_nusaniwe_10km_173",
      "IDN_pp-babar_10km_72",
      "IDN_pp-terselatan_10km_469",
      "IDN_pulau-dullah-utara_10km_389",
      "IDN_pulau-gorom_10km_149",
      "IDN_pulau-pulau-aru_10km_386",
      "IDN_saparua_10km_171",
      "IDN_seram-timur_10km_150",
      "IDN_seram-utara_10km_317",
      "IDN_siwalalat_10km_151",
      "IDN_tanimbar-selatan_10km_443",
      "IDN_tanimbar-utara_10km_387",
      "IDN_tayando-tam_10km_140",
      "IDN_tehoru_10km_470",
      "IDN_teluk-kaiely_10km_270",
      "IDN_teor_10km_152",
      "IDN_waeapo_10km_269",
      "IDN_wakate_10km_153",
      "IDN_wetar-barat_10km_112",
      "IDN_wetar-barat_10km_371",
      "IDN_wetar-timur_10km_187",
      "IDN_wetar-utara_10km_177",
      "IDN_wetar-utara_10km_394",
      "IDN_wetar_10km_14",
      "IDN_wetar_10km_415"
    ],
    "aoi_count": 43,
    "total_hexagons": 2958
  },
  {
    "name": "Maluku Utara",
    "country_iso": "IDN",
    "aois": [
      "IDN_bacan-timur_10km_83",
      "IDN_bacan_10km_82",
      "IDN_gane-barat_10km_239",
      "IDN_jailolo-selatan_10km_5",
      "IDN_kasiruta-barat_10km_240",
      "IDN_kayoa-utara_10km_431",
      "IDN_maba_10km_564",
      "IDN_morotai-selatan_10km_306",
      "IDN_obi-utara_10km_67",
      "IDN_obi_10km_535",
      "IDN_obi_10km_66",
      "IDN_patani-timur_10km_250",
      "IDN_patani_10km_249",
      "IDN_pulau-batang-dua_10km_6",
      "IDN_pulau-gebe_10km_246",
      "IDN_pulau-makian_10km_337",
      "IDN_sanana-utara_10km_244",
      "IDN_taliabu-barat_10km_243",
      "IDN_tobelo-utara_10km_331",
      "IDN_wasile-timur_10km_433",
      "IDN_weda_10km_248"
    ],
    "aoi_count": 21,
    "total_hexagons": 1429
  },
  {
    "name": "Nusa Tenggara Barat",
    "country_iso": "IDN",
    "aois": [
      "IDN_bayan_10km_313",
      "IDN_jerowaru_10km_189",
      "IDN_jerowaru_10km_190",
      "IDN_maluk_10km_272",
      "IDN_moyo-utara_10km_511",
      "IDN_pekat_10km_525",
      "IDN_poto-tano_10km_18",
      "IDN_sape_10km_40",
      "IDN_sekotong_10km_39",
      "IDN_woha_10km_96"
    ],
    "aoi_count": 10,
    "total_hexagons": 773
  },
  {
    "name": "Nusa Tenggara Timur",
    "country_iso": "IDN",
    "aois": [
      "IDN_aesesa_10km_361",
      "IDN_aimere_10km_217",
      "IDN_alok-timur_10km_191",
      "IDN_alor-barat-daya_10km_413",
      "IDN_amfoang-utara_10km_327",
      "IDN_borong_10km_195",
      "IDN_insana-utara_10km_34",
      "IDN_kakuluk-mesak_10km_113",
      "IDN_kambera_10km_20",
      "IDN_komodo_10km_74",
      "IDN_komodo_10km_93",
      "IDN_loura_10km_390",
      "IDN_mamboro_10km_357",
      "IDN_mauponggo_10km_370",
      "IDN_ndao-nuse_10km_302",
      "IDN_nubatukan_10km_21",
      "IDN_omesuri_10km_121",
      "IDN_palue_10km_300",
      "IDN_pantai-baru_10km_301",
      "IDN_pantar-tengah_10km_421",
      "IDN_pantar-timur_10km_418",
      "IDN_pulau-ende_10km_186",
      "IDN_raijua_10km_385",
      "IDN_reok_10km_558",
      "IDN_rote-barat-laut_10km_292",
      "IDN_sabu-barat_10km_188",
      "IDN_semau_10km_127"
    ],
    "aoi_count": 27,
    "total_hexagons": 1886
  },
  {
    "name": "Papua",
    "country_iso": "IDN",
    "aois": [
      "IDN_aimando-padaido_10km_372",
      "IDN_atsy_10km_448",
      "IDN_biak-kota_10km_84",
      "IDN_demta_10km_522",
      "IDN_edera_10km_512",
      "IDN_edera_10km_528",
      "IDN_ilwayab_10km_567",
      "IDN_jair_10km_289",
      "IDN_jayapura-selatan_10km_287",
      "IDN_joerat_10km_87",
      "IDN_kep-ambai_10km_115",
      "IDN_kouh_10km_109",
      "IDN_mamberamo-ilir_10km_373",
      "IDN_mandobo_10km_288",
      "IDN_mimika-timur-jauh_10km_90",
      "IDN_mimika-timur_10km_89",
      "IDN_muting_10km_50",
      "IDN_muting_10km_51",
      "IDN_orkeri_10km_378",
      "IDN_safan_10km_328",
      "IDN_sawa-erma_10km_64",
      "IDN_semangga_10km_445",
      "IDN_sentani-timur_10km_286",
      "IDN_tabonji_10km_527",
      "IDN_teluk-kimi_10km_376",
      "IDN_urei-faisei_10km_268",
      "IDN_yapen-timur_10km_573"
    ],
    "aoi_count": 27,
    "total_hexagons": 1204
  },
  {
    "name": "Papua Barat",
    "country_iso": "IDN",
    "aois": [
      "IDN_babo_10km_436",
      "IDN_batanta-utara_10km_192",
      "IDN_bintuni_10km_380",
      "IDN_fakfak_10km_379",
      "IDN_kaimana_10km_7",
      "IDN_karas_10km_423",
      "IDN_kepulauan-sembilan_10km_193",
      "IDN_kofiau_10km_170",
      "IDN_kokas_10km_460",
      "IDN_kota-waisai_10km_382",
      "IDN_manokwari-selatan_10km_303",
      "IDN_mayamuk_10km_88",
      "IDN_misool-selatan_10km_111",
      "IDN_misool-timur_10km_110",
      "IDN_misool_10km_194",
      "IDN_oransbari_10km_462",
      "IDN_salawati-selatan_10km_384",
      "IDN_salawati-selatan_10km_508",
      "IDN_sumuri_10km_517",
      "IDN_waigeo-barat-kepulauan_10km_294",
      "IDN_waigeo-barat-kepulauan_10km_381",
      "IDN_waigeo-barat_10km_383",
      "IDN_waigeo-barat_10km_543",
      "IDN_wasior_10km_377",
      "IDN_windesi_10km_329"
    ],
    "aoi_count": 25,
    "total_hexagons": 1667
  },
  {
    "name": "Riau",
    "country_iso": "IDN",
    "aois": [
      "IDN_enok_10km_184",
      "IDN_kampa_10km_224",
      "IDN_kampar-kiri-hilir_10km_393",
      "IDN_kateman_10km_156",
      "IDN_koto-gasib_10km_533",
      "IDN_kuala-kampar_10km_444",
      "IDN_mempura_10km_129",
      "IDN_rangsang_10km_333",
      "IDN_rupat_10km_218",
      "IDN_rupat_10km_343",
      "IDN_siak_10km_128",
      "IDN_sungai-apit_10km_216",
      "IDN_tanah-merah_10km_547",
      "IDN_tebing-tinggi_10km_319",
      "IDN_teluk-meranti_10km_478",
      "IDN_tembilahan_10km_185",
      "IDN_tualang_10km_79",
      "IDN_tualang_10km_80",
      "IDN_tualang_10km_81"
    ],
    "aoi_count": 19,
    "total_hexagons": 620
  },
  {
    "name": "Sulawesi Barat",
    "country_iso": "IDN",
    "aois": [
      "IDN_pasangkayu_10km_515",
      "IDN_simboro_10km_148"
    ],
    "aoi_count": 2,
    "total_hexagons": 99
  },
  {
    "name": "Sulawesi Selatan",
    "country_iso": "IDN",
    "aois": [
      "IDN_bangkala_10km_532",
      "IDN_bonto-bahari_10km_103",
      "IDN_bontoa_10km_220",
      "IDN_bontoa_10km_221",
      "IDN_bontoharu_10km_480",
      "IDN_bontomatene_10km_429",
      "IDN_bontosikuyu_10km_365",
      "IDN_bontosikuyu_10km_464",
      "IDN_kepulauan-sangkarrang_10km_19",
      "IDN_malili_10km_506",
      "IDN_pangkajene_10km_222",
      "IDN_pasilambena_10km_367",
      "IDN_pasimarannu_10km_366",
      "IDN_pasimarannu_10km_463",
      "IDN_pasimassunggu_10km_374",
      "IDN_pitumpanua_10km_428",
      "IDN_ponrang_10km_571",
      "IDN_soppeng-riaja_10km_439",
      "IDN_suppa_10km_438",
      "IDN_tanete-riattang-timur_10km_290"
    ],
    "aoi_count": 20,
    "total_hexagons": 1319
  },
  {
    "name": "Sulawesi Tengah",
    "country_iso": "IDN",
    "aois": [
      "IDN_bahodopi_10km_513",
      "IDN_baolan_10km_147",
      "IDN_buko_10km_227",
      "IDN_bungku-utara_10km_452",
      "IDN_kintom_10km_536",
      "IDN_luwuk-utara_10km_95",
      "IDN_pagimana_10km_451",
      "IDN_parigi-utara_10km_307",
      "IDN_petasia_10km_273",
      "IDN_poso-kota-utara_10km_505",
      "IDN_ratolindo_10km_309",
      "IDN_tinangkung-selatan_10km_228",
      "IDN_tinangkung_10km_245",
      "IDN_ulujadi_10km_214",
      "IDN_una-una_10km_310",
      "IDN_walea-besar_10km_116"
    ],
    "aoi_count": 16,
    "total_hexagons": 1175
  },
  {
    "name": "Sulawesi Tenggara",
    "country_iso": "IDN",
    "aois": [
      "IDN_binongko_10km_359",
      "IDN_bonegunu_10km_362",
      "IDN_kabaena-barat_10km_55",
      "IDN_kabaena-timur_10km_65",
      "IDN_kabaena-utara_10km_54",
      "IDN_kaledupa_10km_360",
      "IDN_kapoiala_10km_98",
      "IDN_katobu_10km_291",
      "IDN_katoi_10km_340",
      "IDN_kulisusu-barat_10km_363",
      "IDN_kulisusu-utara_10km_364",
      "IDN_laonti_10km_23",
      "IDN_laonti_10km_24",
      "IDN_lasalimu_10km_164",
      "IDN_mawasangka_10km_425",
      "IDN_napabalano_10km_427",
      "IDN_poleang-selatan_10km_22",
      "IDN_pomalaa_10km_308",
      "IDN_siompu_10km_223",
      "IDN_soropia_10km_97",
      "IDN_tiworo-utara_10km_100",
      "IDN_tiworo-utara_10km_25",
      "IDN_tomia_10km_312",
      "IDN_wabula_10km_163",
      "IDN_wangi-wangi-selatan_10km_358",
      "IDN_wawonii-tengah_10km_426",
      "IDN_wiwirano_10km_311"
    ],
    "aoi_count": 27,
    "total_hexagons": 2014
  },
  {
    "name": "Sulawesi Utara",
    "country_iso": "IDN",
    "aois": [
      "IDN_amurang-barat_10km_201",
      "IDN_beo-utara_10km_57",
      "IDN_biaro_10km_179",
      "IDN_essang_10km_198",
      "IDN_kendahe_10km_205",
      "IDN_kepulauan-marore_10km_204",
      "IDN_lembeh-selatan_10km_94",
      "IDN_likupang-timur_10km_75",
      "IDN_lolak_10km_537",
      "IDN_manganitu-selatan_10km_202",
      "IDN_melonguane_10km_44",
      "IDN_miangas_10km_59",
      "IDN_nanusa_10km_58",
      "IDN_pinogaluman_10km_355",
      "IDN_pinolosian-timur_10km_434",
      "IDN_siau-barat-selatan_10km_285",
      "IDN_siau-barat_10km_99",
      "IDN_tagulandang_10km_182",
      "IDN_tahuna-barat_10km_203",
      "IDN_tampa-na-mma_10km_197",
      "IDN_tatoareng_10km_176",
      "IDN_wori_10km_117"
    ],
    "aoi_count": 22,
    "total_hexagons": 1687
  },
  {
    "name": "Sumatera Barat",
    "country_iso": "IDN",
    "aois": [
      "IDN_bayang_10km_262",
      "IDN_bungus-teluk-kabung_10km_264",
      "IDN_koto-xi-tarusan_10km_263",
      "IDN_pagai-utara_10km_293",
      "IDN_pangkalan-koto-baru_10km_345",
      "IDN_pangkalan-koto-baru_10km_346",
      "IDN_pariaman-tengah_10km_554",
      "IDN_seberut-barat-daya_10km_369",
      "IDN_siberut-selatan_10km_251",
      "IDN_siberut-tengah_10km_435",
      "IDN_siberut-utara_10km_254",
      "IDN_sikakap_10km_356",
      "IDN_sipora-selatan_10km_299",
      "IDN_sipora-utara_10km_368",
      "IDN_sungai-beremas_10km_392"
    ],
    "aoi_count": 15,
    "total_hexagons": 616
  },
  {
    "name": "Sumatera Selatan",
    "country_iso": "IDN",
    "aois": [
      "IDN_air-kumbang_10km_133",
      "IDN_air-saleh_10km_137",
      "IDN_air-sugihan_10km_130",
      "IDN_air-sugihan_10km_578",
      "IDN_babat-supat_10km_484",
      "IDN_banyuasin-i_10km_132",
      "IDN_banyuasin-ii_10km_138",
      "IDN_bayung-lencir_10km_181",
      "IDN_cengal_10km_61",
      "IDN_muara-padang_10km_134",
      "IDN_muara-padang_10km_135",
      "IDN_muara-padang_10km_136",
      "IDN_rantau-bayur_10km_529",
      "IDN_rupit_10km_225",
      "IDN_sungai-menang_10km_252",
      "IDN_talang-kelapa_10km_131",
      "IDN_tulung-selapan_10km_60"
    ],
    "aoi_count": 17,
    "total_hexagons": 497
  },
  {
    "name": "Sumatera Utara",
    "country_iso": "IDN",
    "aois": [
      "IDN_bilah-barat_10km_144",
      "IDN_bilah-hilir_10km_145",
      "IDN_brandan-barat_10km_422",
      "IDN_danau-toba_10km_77",
      "IDN_gunungsitoli-selatan_10km_437",
      "IDN_hamparan-perak_10km_86",
      "IDN_kualuh-hilir_10km_342",
      "IDN_medang-deras_10km_487",
      "IDN_panai-hulu_10km_341",
      "IDN_pangkatan_10km_141",
      "IDN_pangkatan_10km_142",
      "IDN_pangkatan_10km_143",
      "IDN_pulau-pulau-batu-timur_10km_419",
      "IDN_pulau-pulau-batu_10km_226",
      "IDN_tanjung-balai_10km_85",
      "IDN_tapian-nauli_10km_219",
      "IDN_teluk-dalam_10km_344",
      "IDN_wampu_10km_330"
    ],
    "aoi_count": 18,
    "total_hexagons": 676
  }
];

const PHL_PROVINCES: CoastalProvince[] = [
  {
    "name": "Agusan del Norte",
    "country_iso": "PHL",
    "aois": [
      "PHL_butuan-city-capital_10km_129"
    ],
    "aoi_count": 1,
    "total_hexagons": 153
  },
  {
    "name": "Agusan del Sur",
    "country_iso": "PHL",
    "aois": [
      "PHL_bunawan_10km_133",
      "PHL_bunawan_10km_134",
      "PHL_esperanza_10km_130",
      "PHL_loreto_10km_135"
    ],
    "aoi_count": 4,
    "total_hexagons": 23
  },
  {
    "name": "Aklan",
    "country_iso": "PHL",
    "aois": [
      "PHL_malay_10km_38",
      "PHL_roxas-city-capital_10km_57"
    ],
    "aoi_count": 2,
    "total_hexagons": 422
  },
  {
    "name": "Albay",
    "country_iso": "PHL",
    "aois": [
      "PHL_city-of-tabaco_10km_77",
      "PHL_pio-duran_10km_227"
    ],
    "aoi_count": 2,
    "total_hexagons": 268
  },
  {
    "name": "Antique",
    "country_iso": "PHL",
    "aois": [
      "PHL_caluya_10km_192",
      "PHL_caluya_10km_262",
      "PHL_culasi_10km_221",
      "PHL_culasi_10km_60",
      "PHL_san-jose-capital_10km_251"
    ],
    "aoi_count": 5,
    "total_hexagons": 437
  },
  {
    "name": "Aurora",
    "country_iso": "PHL",
    "aois": [
      "PHL_casiguran_10km_176",
      "PHL_dingalan_10km_181"
    ],
    "aoi_count": 2,
    "total_hexagons": 77
  },
  {
    "name": "Basilan",
    "country_iso": "PHL",
    "aois": [
      "PHL_city-of-lamitan_10km_17",
      "PHL_maluso_10km_259"
    ],
    "aoi_count": 2,
    "total_hexagons": 125
  },
  {
    "name": "Bataan",
    "country_iso": "PHL",
    "aois": [
      "PHL_abucay_10km_1",
      "PHL_bulacan_10km_2"
    ],
    "aoi_count": 2,
    "total_hexagons": 427
  },
  {
    "name": "Batanes",
    "country_iso": "PHL",
    "aois": [
      "PHL_itbayat_10km_69",
      "PHL_sabtang_10km_62"
    ],
    "aoi_count": 2,
    "total_hexagons": 267
  },
  {
    "name": "Batangas",
    "country_iso": "PHL",
    "aois": [
      "PHL_calatagan_10km_72",
      "PHL_city-of-calapan-capital_10km_74",
      "PHL_city-of-tanauan_10km_73",
      "PHL_nasugbu_10km_189",
      "PHL_san-juan_10km_186"
    ],
    "aoi_count": 5,
    "total_hexagons": 686
  },
  {
    "name": "Bohol",
    "country_iso": "PHL",
    "aois": [
      "PHL_guindulman_10km_103",
      "PHL_inabanga_10km_42",
      "PHL_lapu-lapu-city-opon_10km_12",
      "PHL_maribojoc_10km_44"
    ],
    "aoi_count": 4,
    "total_hexagons": 971
  },
  {
    "name": "Bulacan",
    "country_iso": "PHL",
    "aois": [
      "PHL_city-of-malolos-capital_10km_3"
    ],
    "aoi_count": 1,
    "total_hexagons": 1
  },
  {
    "name": "Cagayan",
    "country_iso": "PHL",
    "aois": [
      "PHL_aparri_10km_154",
      "PHL_calayan_10km_51",
      "PHL_claveria_10km_52",
      "PHL_lal-lo_10km_155",
      "PHL_penablanca_10km_180",
      "PHL_santa-ana_10km_61",
      "PHL_santo-nino-faire_10km_109"
    ],
    "aoi_count": 7,
    "total_hexagons": 352
  },
  {
    "name": "Camarines Norte",
    "country_iso": "PHL",
    "aois": [
      "PHL_mercedes_10km_148",
      "PHL_paracale_10km_149",
      "PHL_vinzons_10km_150",
      "PHL_vinzons_10km_151"
    ],
    "aoi_count": 4,
    "total_hexagons": 262
  },
  {
    "name": "Camarines Sur",
    "country_iso": "PHL",
    "aois": [
      "PHL_bula_10km_253",
      "PHL_caramoan_10km_200",
      "PHL_lagonoy_10km_220",
      "PHL_magarao_10km_217",
      "PHL_pasacao_10km_218",
      "PHL_san-jose_10km_216"
    ],
    "aoi_count": 6,
    "total_hexagons": 405
  },
  {
    "name": "Camiguin",
    "country_iso": "PHL",
    "aois": [
      "PHL_mahinog_10km_46"
    ],
    "aoi_count": 1,
    "total_hexagons": 188
  },
  {
    "name": "Capiz",
    "country_iso": "PHL",
    "aois": [
      "PHL_dao_10km_55",
      "PHL_dumalag_10km_56"
    ],
    "aoi_count": 2,
    "total_hexagons": 2
  },
  {
    "name": "Catanduanes",
    "country_iso": "PHL",
    "aois": [
      "PHL_baras_10km_201",
      "PHL_panganiban-payo_10km_231",
      "PHL_san-andres-calolbon_10km_202"
    ],
    "aoi_count": 3,
    "total_hexagons": 251
  },
  {
    "name": "Cebu",
    "country_iso": "PHL",
    "aois": [
      "PHL_badian_10km_97",
      "PHL_balamban_10km_83",
      "PHL_city-of-bogo_10km_58",
      "PHL_dalaguete_10km_261",
      "PHL_dumanjug_10km_223",
      "PHL_medellin_10km_59",
      "PHL_toledo-city_10km_84",
      "PHL_tuburan_10km_165"
    ],
    "aoi_count": 8,
    "total_hexagons": 650
  },
  {
    "name": "City of Isabela (not a province)",
    "country_iso": "PHL",
    "aois": [
      "PHL_city-of-isabela_10km_98"
    ],
    "aoi_count": 1,
    "total_hexagons": 45
  },
  {
    "name": "Davao Occidental",
    "country_iso": "PHL",
    "aois": [
      "PHL_malita_10km_260",
      "PHL_sarangani_10km_235"
    ],
    "aoi_count": 2,
    "total_hexagons": 157
  },
  {
    "name": "Davao Oriental",
    "country_iso": "PHL",
    "aois": [
      "PHL_cateel_10km_132",
      "PHL_city-of-mati-capital_10km_131",
      "PHL_city-of-mati-capital_10km_256",
      "PHL_governor-generoso_10km_183",
      "PHL_lupon_10km_238"
    ],
    "aoi_count": 5,
    "total_hexagons": 246
  },
  {
    "name": "Davao del Norte",
    "country_iso": "PHL",
    "aois": [
      "PHL_davao-city_10km_76",
      "PHL_kapalong_10km_153"
    ],
    "aoi_count": 2,
    "total_hexagons": 300
  },
  {
    "name": "Dinagat Islands",
    "country_iso": "PHL",
    "aois": [
      "PHL_tubajon_10km_35"
    ],
    "aoi_count": 1,
    "total_hexagons": 83
  },
  {
    "name": "Eastern Samar",
    "country_iso": "PHL",
    "aois": [
      "PHL_can-avid_10km_119",
      "PHL_can-avid_10km_120",
      "PHL_can-avid_10km_121",
      "PHL_can-avid_10km_122",
      "PHL_city-of-borongan-capital_10km_63",
      "PHL_city-of-borongan-capital_10km_64",
      "PHL_dolores_10km_124",
      "PHL_general-macarthur_10km_65",
      "PHL_guiuan_10km_190",
      "PHL_llorente_10km_66",
      "PHL_maydolong_10km_67",
      "PHL_oras_10km_125",
      "PHL_oras_10km_126",
      "PHL_oras_10km_127",
      "PHL_salcedo_10km_68"
    ],
    "aoi_count": 15,
    "total_hexagons": 540
  },
  {
    "name": "Guimaras",
    "country_iso": "PHL",
    "aois": [
      "PHL_dumangas_10km_137"
    ],
    "aoi_count": 1,
    "total_hexagons": 273
  },
  {
    "name": "Ilocos Norte",
    "country_iso": "PHL",
    "aois": [
      "PHL_badoc_10km_196"
    ],
    "aoi_count": 1,
    "total_hexagons": 38
  },
  {
    "name": "Ilocos Sur",
    "country_iso": "PHL",
    "aois": [
      "PHL_cabugao_10km_247",
      "PHL_caoayan_10km_244"
    ],
    "aoi_count": 2,
    "total_hexagons": 55
  },
  {
    "name": "Iloilo",
    "country_iso": "PHL",
    "aois": [
      "PHL_carles_10km_75",
      "PHL_enrique-b-magalona-saravia_10km_96",
      "PHL_guimbal_10km_195"
    ],
    "aoi_count": 3,
    "total_hexagons": 339
  },
  {
    "name": "Isabela",
    "country_iso": "PHL",
    "aois": [
      "PHL_angadanan_10km_184",
      "PHL_cabagan_10km_193",
      "PHL_maconacon_10km_177",
      "PHL_san-mariano_10km_157"
    ],
    "aoi_count": 4,
    "total_hexagons": 81
  },
  {
    "name": "La Union",
    "country_iso": "PHL",
    "aois": [
      "PHL_san-juan_10km_255",
      "PHL_santo-tomas_10km_252"
    ],
    "aoi_count": 2,
    "total_hexagons": 93
  },
  {
    "name": "Laguna",
    "country_iso": "PHL",
    "aois": [
      "PHL_lumban_10km_187"
    ],
    "aoi_count": 1,
    "total_hexagons": 7
  },
  {
    "name": "Lanao del Norte",
    "country_iso": "PHL",
    "aois": [
      "PHL_iligan-city_10km_104",
      "PHL_sultan-naga-dimaporo-karomatan_10km_246"
    ],
    "aoi_count": 2,
    "total_hexagons": 105
  },
  {
    "name": "Lanao del Sur",
    "country_iso": "PHL",
    "aois": [
      "PHL_masiu_10km_243"
    ],
    "aoi_count": 1,
    "total_hexagons": 42
  },
  {
    "name": "Leyte",
    "country_iso": "PHL",
    "aois": [
      "PHL_abuyog_10km_212",
      "PHL_city-of-baybay_10km_169",
      "PHL_gandara_10km_24",
      "PHL_tanauan_10km_15"
    ],
    "aoi_count": 4,
    "total_hexagons": 1284
  },
  {
    "name": "Maguindanao del Norte",
    "country_iso": "PHL",
    "aois": [
      "PHL_parang_10km_249"
    ],
    "aoi_count": 1,
    "total_hexagons": 44
  },
  {
    "name": "Marinduque",
    "country_iso": "PHL",
    "aois": [
      "PHL_mogpog_10km_210",
      "PHL_santa-cruz_10km_228"
    ],
    "aoi_count": 2,
    "total_hexagons": 168
  },
  {
    "name": "Masbate",
    "country_iso": "PHL",
    "aois": [
      "PHL_aroroy_10km_199",
      "PHL_cawayan_10km_152",
      "PHL_claveria_10km_226",
      "PHL_magallanes_10km_141",
      "PHL_mandaon_10km_143",
      "PHL_san-pascual_10km_229"
    ],
    "aoi_count": 6,
    "total_hexagons": 601
  },
  {
    "name": "Metropolitan Manila Second District",
    "country_iso": "PHL",
    "aois": [
      "PHL_city-of-mandaluyong_10km_6",
      "PHL_city-of-pasig_10km_7",
      "PHL_city-of-pasig_10km_8"
    ],
    "aoi_count": 3,
    "total_hexagons": 6
  },
  {
    "name": "Metropolitan Manila Third District",
    "country_iso": "PHL",
    "aois": [
      "PHL_city-of-navotas_10km_9"
    ],
    "aoi_count": 1,
    "total_hexagons": 1
  },
  {
    "name": "Misamis Occidental",
    "country_iso": "PHL",
    "aois": [
      "PHL_lala_10km_167"
    ],
    "aoi_count": 1,
    "total_hexagons": 220
  },
  {
    "name": "Misamis Oriental",
    "country_iso": "PHL",
    "aois": [
      "PHL_cagayan-de-oro-city-capital_10km_234",
      "PHL_gingoog-city_10km_257"
    ],
    "aoi_count": 2,
    "total_hexagons": 188
  },
  {
    "name": "Negros Occidental",
    "country_iso": "PHL",
    "aois": [
      "PHL_bacolod-city-capital_10km_185",
      "PHL_city-of-escalante_10km_162",
      "PHL_city-of-himamaylan_10km_209",
      "PHL_city-of-sipalay_10km_95"
    ],
    "aoi_count": 4,
    "total_hexagons": 502
  },
  {
    "name": "Negros Oriental",
    "country_iso": "PHL",
    "aois": [
      "PHL_bais-city_10km_222",
      "PHL_city-of-guihulngan_10km_100",
      "PHL_enrique-villanueva_10km_93",
      "PHL_siaton_10km_91",
      "PHL_sibulan_10km_92"
    ],
    "aoi_count": 5,
    "total_hexagons": 471
  },
  {
    "name": "Northern Samar",
    "country_iso": "PHL",
    "aois": [
      "PHL_catarman-capital_10km_78",
      "PHL_catubig_10km_110",
      "PHL_catubig_10km_111",
      "PHL_catubig_10km_114",
      "PHL_laoang_10km_115",
      "PHL_laoang_10km_116",
      "PHL_lapinig_10km_128",
      "PHL_las-navas_10km_117",
      "PHL_pambujan_10km_118",
      "PHL_rosario_10km_160",
      "PHL_san-vicente_10km_219"
    ],
    "aoi_count": 11,
    "total_hexagons": 368
  },
  {
    "name": "Occidental Mindoro",
    "country_iso": "PHL",
    "aois": [
      "PHL_looc_10km_188",
      "PHL_magsaysay_10km_161",
      "PHL_sablayan_10km_206"
    ],
    "aoi_count": 3,
    "total_hexagons": 278
  },
  {
    "name": "Oriental Mindoro",
    "country_iso": "PHL",
    "aois": [
      "PHL_bulalacao-san-pedro_10km_163",
      "PHL_pinamalayan_10km_166",
      "PHL_roxas_10km_171"
    ],
    "aoi_count": 3,
    "total_hexagons": 132
  },
  {
    "name": "Palawan",
    "country_iso": "PHL",
    "aois": [
      "PHL_balabac_10km_90",
      "PHL_bataraza_10km_197",
      "PHL_bataraza_10km_198",
      "PHL_brooke-s-point_10km_102",
      "PHL_busuanga_10km_85",
      "PHL_coron_10km_207",
      "PHL_coron_10km_208",
      "PHL_coron_10km_215",
      "PHL_coron_10km_29",
      "PHL_culion_10km_191",
      "PHL_cuyo_10km_179",
      "PHL_el-nido-bacuit_10km_30",
      "PHL_el-nido-bacuit_10km_86",
      "PHL_kalayaan_10km_224",
      "PHL_kalayaan_10km_242",
      "PHL_kalayaan_10km_88",
      "PHL_kalayaan_10km_89",
      "PHL_linapacan_10km_146",
      "PHL_narra_10km_264",
      "PHL_puerto-princesa-city-capital_10km_14",
      "PHL_puerto-princesa-city-capital_10km_40",
      "PHL_quezon_10km_248",
      "PHL_quezon_10km_263",
      "PHL_roxas_10km_239",
      "PHL_san-vicente_10km_175",
      "PHL_sofronio-espanola_10km_265",
      "PHL_taytay_10km_136",
      "PHL_taytay_10km_237",
      "PHL_taytay_10km_82"
    ],
    "aoi_count": 29,
    "total_hexagons": 2068
  },
  {
    "name": "Pampanga",
    "country_iso": "PHL",
    "aois": [
      "PHL_guagua_10km_204",
      "PHL_lubao_10km_4"
    ],
    "aoi_count": 2,
    "total_hexagons": 45
  },
  {
    "name": "Pangasinan",
    "country_iso": "PHL",
    "aois": [
      "PHL_anda_10km_172",
      "PHL_binmaley_10km_140",
      "PHL_city-of-alaminos_10km_139"
    ],
    "aoi_count": 3,
    "total_hexagons": 224
  },
  {
    "name": "Quezon",
    "country_iso": "PHL",
    "aois": [
      "PHL_burdeos_10km_178",
      "PHL_calauag_10km_47",
      "PHL_catanauan_10km_48",
      "PHL_infanta_10km_70",
      "PHL_jomalig_10km_182",
      "PHL_lucena-city-capital_10km_49",
      "PHL_mauban_10km_194",
      "PHL_san-andres_10km_50"
    ],
    "aoi_count": 8,
    "total_hexagons": 1238
  },
  {
    "name": "Rizal",
    "country_iso": "PHL",
    "aois": [
      "PHL_tanay_10km_147",
      "PHL_taytay_10km_5"
    ],
    "aoi_count": 2,
    "total_hexagons": 160
  },
  {
    "name": "Romblon",
    "country_iso": "PHL",
    "aois": [
      "PHL_banton_10km_36",
      "PHL_cajidiocan_10km_225",
      "PHL_concepcion_10km_211",
      "PHL_magdiwang_10km_164",
      "PHL_odiongan_10km_39",
      "PHL_romblon-capital_10km_37"
    ],
    "aoi_count": 6,
    "total_hexagons": 499
  },
  {
    "name": "Samar (Western Samar)",
    "country_iso": "PHL",
    "aois": [
      "PHL_basey_10km_16",
      "PHL_gandara_10km_20",
      "PHL_gandara_10km_22",
      "PHL_gandara_10km_23",
      "PHL_san-jorge_10km_26",
      "PHL_san-jorge_10km_27",
      "PHL_san-jorge_10km_28",
      "PHL_san-sebastian_10km_25"
    ],
    "aoi_count": 8,
    "total_hexagons": 347
  },
  {
    "name": "Siquijor",
    "country_iso": "PHL",
    "aois": [
      "PHL_maria_10km_94"
    ],
    "aoi_count": 1,
    "total_hexagons": 50
  },
  {
    "name": "Sorsogon",
    "country_iso": "PHL",
    "aois": [
      "PHL_matnog_10km_18",
      "PHL_pilar_10km_142"
    ],
    "aoi_count": 2,
    "total_hexagons": 87
  },
  {
    "name": "South Cotabato",
    "country_iso": "PHL",
    "aois": [
      "PHL_general-santos-city-dadiangas_10km_236"
    ],
    "aoi_count": 1,
    "total_hexagons": 106
  },
  {
    "name": "Southern Leyte",
    "country_iso": "PHL",
    "aois": [
      "PHL_hilongos_10km_158",
      "PHL_hinunangan_10km_159",
      "PHL_san-ricardo_10km_168"
    ],
    "aoi_count": 3,
    "total_hexagons": 519
  },
  {
    "name": "Sulu",
    "country_iso": "PHL",
    "aois": [
      "PHL_hadji-panglima-tahil-marunggas_10km_107",
      "PHL_pandami_10km_214",
      "PHL_pata_10km_108"
    ],
    "aoi_count": 3,
    "total_hexagons": 369
  },
  {
    "name": "Surigao del Norte",
    "country_iso": "PHL",
    "aois": [
      "PHL_surigao-city-capital_10km_33"
    ],
    "aoi_count": 1,
    "total_hexagons": 961
  },
  {
    "name": "Surigao del Sur",
    "country_iso": "PHL",
    "aois": [
      "PHL_city-of-bislig_10km_105",
      "PHL_hinatuan_10km_106",
      "PHL_tago_10km_240"
    ],
    "aoi_count": 3,
    "total_hexagons": 147
  },
  {
    "name": "Tawi-Tawi",
    "country_iso": "PHL",
    "aois": [
      "PHL_languyan_10km_101",
      "PHL_sitangkai_10km_80"
    ],
    "aoi_count": 2,
    "total_hexagons": 1054
  },
  {
    "name": "Zambales",
    "country_iso": "PHL",
    "aois": [
      "PHL_candelaria_10km_173",
      "PHL_subic_10km_233"
    ],
    "aoi_count": 2,
    "total_hexagons": 285
  },
  {
    "name": "Zamboanga Sibugay",
    "country_iso": "PHL",
    "aois": [
      "PHL_alicia_10km_230",
      "PHL_naga_10km_258"
    ],
    "aoi_count": 2,
    "total_hexagons": 93
  },
  {
    "name": "Zamboanga del Norte",
    "country_iso": "PHL",
    "aois": [
      "PHL_dapitan-city_10km_144",
      "PHL_katipunan_10km_145",
      "PHL_liloy_10km_254",
      "PHL_sindangan_10km_245"
    ],
    "aoi_count": 4,
    "total_hexagons": 269
  },
  {
    "name": "Zamboanga del Sur",
    "country_iso": "PHL",
    "aois": [
      "PHL_kumalarang_10km_203",
      "PHL_pagadian-city-capital_10km_232",
      "PHL_zamboanga-city_10km_241",
      "PHL_zamboanga-city_10km_87"
    ],
    "aoi_count": 4,
    "total_hexagons": 239
  }
];

const BGD_PROVINCES: CoastalProvince[] = [
  {
    "name": "Barishal",
    "country_iso": "BGD",
    "aois": [
      "BGD_barguna-sadar_10km_67",
      "BGD_barishal-sadar-kotwali_10km_69",
      "BGD_bhola-sadar_10km_75",
      "BGD_charfasson_10km_99",
      "BGD_hijla_10km_68",
      "BGD_mathbaria_10km_78",
      "BGD_mehendiganj_10km_70",
      "BGD_mehendiganj_10km_71",
      "BGD_muladi_10km_72",
      "BGD_muladi_10km_73",
      "BGD_nazirpur_10km_79",
      "BGD_rangabali_10km_77"
    ],
    "aoi_count": 12,
    "total_hexagons": 798
  },
  {
    "name": "Chattogram",
    "country_iso": "BGD",
    "aois": [
      "BGD_brahmanbaria-sadar_10km_51",
      "BGD_hatiya_10km_94",
      "BGD_homna_10km_19",
      "BGD_monpura_10km_103",
      "BGD_nabinagar_10km_52",
      "BGD_nasirnagar_10km_60",
      "BGD_nikli_10km_54",
      "BGD_rangamati-sadar_10km_45",
      "BGD_rangunia_10km_44",
      "BGD_ruma_10km_96",
      "BGD_sitakunda_10km_84",
      "BGD_teknaf_10km_104"
    ],
    "aoi_count": 12,
    "total_hexagons": 1311
  },
  {
    "name": "Dhaka",
    "country_iso": "BGD",
    "aois": [
      "BGD_bhuanpur_10km_82",
      "BGD_chandpur-sadar_10km_17",
      "BGD_char-bhadrasan_10km_32",
      "BGD_damudya_10km_39",
      "BGD_dhaka-north-city-corporation_10km_25",
      "BGD_dhaka-north-city-corporation_10km_26",
      "BGD_dhaka-north-city-corporation_10km_27",
      "BGD_dhaka-north-city-corporation_10km_28",
      "BGD_dhaka-north-city-corporation_10km_29",
      "BGD_dhaka-north-city-corporation_10km_30",
      "BGD_dhaka-north-city-corporation_10km_31",
      "BGD_dhaka-south-city-corporation_10km_24",
      "BGD_dhamrai_10km_20",
      "BGD_gazaria_10km_37",
      "BGD_gazipur-city-corporation_10km_33",
      "BGD_goalanda_10km_62",
      "BGD_itna_10km_53",
      "BGD_kapasia_10km_101",
      "BGD_keraniganj_10km_21",
      "BGD_madaripur-sadar_10km_34",
      "BGD_muksudpur_10km_93",
      "BGD_naria_10km_40",
      "BGD_savar_10km_22",
      "BGD_savar_10km_23",
      "BGD_singair_10km_35",
      "BGD_singair_10km_36",
      "BGD_tarail_10km_100",
      "BGD_tongibari_10km_38",
      "BGD_zajira_10km_41"
    ],
    "aoi_count": 29,
    "total_hexagons": 733
  },
  {
    "name": "Khulna",
    "country_iso": "BGD",
    "aois": [
      "BGD_ashashuni_10km_13",
      "BGD_ashashuni_10km_15",
      "BGD_bagerhat-sadar_10km_4",
      "BGD_koyra_10km_105",
      "BGD_koyra_10km_7",
      "BGD_koyra_10km_8",
      "BGD_kumarkhali_10km_49",
      "BGD_kumarkhali_10km_50",
      "BGD_mongla_10km_5",
      "BGD_paikgachha_10km_10",
      "BGD_phultala_10km_11",
      "BGD_rupsa_10km_12",
      "BGD_sharankhola_10km_106",
      "BGD_shyamnagar_10km_16",
      "BGD_sreepur_10km_1"
    ],
    "aoi_count": 15,
    "total_hexagons": 734
  },
  {
    "name": "Mymensingh",
    "country_iso": "BGD",
    "aois": [
      "BGD_durgapur_10km_65",
      "BGD_fulpur_10km_64",
      "BGD_islampur_10km_47",
      "BGD_jamalpur-sadar_10km_46",
      "BGD_mymensingh-city-corporation_10km_90",
      "BGD_netrakona-sadar_10km_66",
      "BGD_sreepur_10km_102"
    ],
    "aoi_count": 7,
    "total_hexagons": 61
  },
  {
    "name": "Rajshahi",
    "country_iso": "BGD",
    "aois": [
      "BGD_manda_10km_43",
      "BGD_paba_10km_42",
      "BGD_sariakandi_10km_81",
      "BGD_sirajganj-sadar_10km_83",
      "BGD_sujanagar_10km_63"
    ],
    "aoi_count": 5,
    "total_hexagons": 116
  },
  {
    "name": "Rangpur",
    "country_iso": "BGD",
    "aois": [
      "BGD_badarganj_10km_91",
      "BGD_chilmari_10km_88",
      "BGD_chirirbandar_10km_2",
      "BGD_chirirbandar_10km_3",
      "BGD_fulchhari_10km_48",
      "BGD_phulbari_10km_97",
      "BGD_rajibpur_10km_87",
      "BGD_roumari_10km_89"
    ],
    "aoi_count": 8,
    "total_hexagons": 48
  },
  {
    "name": "Sylhet",
    "country_iso": "BGD",
    "aois": [
      "BGD_baniachong_10km_61",
      "BGD_chhatak_10km_92",
      "BGD_derai_10km_55",
      "BGD_derai_10km_56",
      "BGD_dharmapasha_10km_57",
      "BGD_golapganj_10km_98",
      "BGD_shalla_10km_58",
      "BGD_tahirpur_10km_59"
    ],
    "aoi_count": 8,
    "total_hexagons": 203
  }
];

export const COASTAL_PROVINCES: CoastalProvince[] = [
  ...THA_PROVINCES,
  ...IDN_PROVINCES,
  ...PHL_PROVINCES,
  ...BGD_PROVINCES,
];

export function getProvincesByCountry(countryIso: string): CoastalProvince[] {
  return COASTAL_PROVINCES.filter(
    (p) => p.country_iso === countryIso || p.countryIso === countryIso
  );
}

export function resolveCoastalLocations(
  locations: any[],
  countryIso: string
): { aoiIds: string[]; names: string[] } {
  const provinces = getProvincesByCountry(countryIso);
  const aoiIds: string[] = [];
  const names: string[] = [];

  for (const loc of locations) {
    if (loc.type === 'province') {
      const p = provinces.find((prov) => prov.name === loc.name);
      if (p) {
        aoiIds.push(...p.aois);
        names.push(p.name);
      }
    } else {
      aoiIds.push(loc.aoi_id);
      names.push(loc.name);
    }
  }
  return { aoiIds, names };
}

export function formatDisplayName(aoiId: string): string {
  if (!aoiId) return '';
  const parts = aoiId.split('_');
  if (parts.length >= 2) {
    const rawName = parts[1];
    const words = rawName.replace(/([A-Z])/g, ' ').trim().split(/[-_\s]+/);
    return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  }
  return aoiId;
}
