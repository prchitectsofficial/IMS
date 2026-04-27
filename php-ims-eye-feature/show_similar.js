/**
 * Eye icon — Similar channels expandable row (PHP IMS).
 * Requires jQuery. Uses existing bmiajax.php?action=get_similar.
 * DO NOT change backend or DB; injects returned HTML as-is.
 */
(function () {
  'use strict';

  var AJAX_URL = '/accusys.org/new-admin/bmi/bmiajax.php';

  /**
   * Toggle expandable row and load similar channels.
   * @param {string} tags - Comma-separated tag keywords (top tags).
   * @param {number|string} id - Influencer record id (light_ims id).
   */
  window.show_stats = function show_stats(tags, id) {
    var $collapse = $('#collapse_' + id);
    var $target = $('#show_similar_' + id);

    $collapse.toggle('slide');
    $target.html('<tr><td colspan="10">Loading similar channels...</td></tr>');

    $.post(AJAX_URL, {
      action: 'get_similar',
      tags: tags,
      id: id,
      table_name: 'bmi.light_ims'
    })
    .done(function (response) {
      $target.html(response);
    })
    .fail(function () {
      $target.html('<tr><td colspan="10">Error loading data</td></tr>');
    });
  };
})();
