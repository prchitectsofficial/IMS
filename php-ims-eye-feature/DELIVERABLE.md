# Eye Icon Feature — PHP IMS (Exact Old Behaviour)

Replicates the **expandable row + similar channels** behaviour. No modal, no DB change, no bmiajax.php change. Uses existing `action=get_similar` endpoint.

---

## FLOW (Comments)

1. **User** clicks eye icon in TAGS column (below niches).
2. **Frontend** calls `show_stats(TAG_STRING, RECORD_ID)`.
3. **show_stats()**:
   - Toggles the hidden row `#collapse_RECORDID` with slide animation.
   - Sets loading message in `#show_similar_RECORDID`.
   - Sends AJAX POST to `bmiajax.php` with `action=get_similar`, `tags`, `id`, `table_name=bmi.light_ims`.
4. **Backend** (existing bmiajax.php) fetches from `bmi.light_ims`, returns **HTML**.
5. **Frontend** injects that HTML into the expandable row table; user sees similar channel content. Toggle closes/opens the same row.

---

## 1. Updated Influencer Table Row HTML

Place the eye icon **inside the TAGS column**, below the niches/tags display.

- `TAG_STRING` = comma-separated tags (e.g. from `top_two_tags` or your tags field).
- `RECORD_ID` = influencer row id (e.g. `id` from `light_ims`).

```html
<tr>
  <td>...</td>
  <!-- Other columns: Channel, etc. -->
  <td>
    <!-- Niches/Tags display (existing) -->
    <div class="niches">Tech(85), Gaming(72)</div>
    <!-- Eye icon button - BELOW niches -->
    <button type="button"
            class="btn btn-success btn-small"
            onclick="show_stats('Tech,Gaming', 123);"
            title="Show similar channels">
      <img src="/images/show_similar.png" width="28" alt="Similar">
    </button>
  </td>
  <td>...</td>
</tr>
```

**PHP example** (when you render rows from DB):

```php
<?php
$tags_display = ''; // your niches display string
$tags_for_ajax = ''; // comma-separated for AJAX (e.g. from top_two_tags)
$record_id = (int)$row['id'];
?>
<td>
  <div class="niches"><?php echo htmlspecialchars($tags_display); ?></div>
  <button type="button"
          class="btn btn-success btn-small"
          onclick="show_stats('<?php echo htmlspecialchars($tags_for_ajax); ?>', <?php echo $record_id; ?>);"
          title="Show similar channels">
    <img src="/images/show_similar.png" width="28" alt="Similar">
  </button>
</td>
```

---

## 2. Hidden Expandable Row HTML

Add **immediately after each influencer row** one hidden row. Replace `RECORDID` with the same id used in the button.

```html
<tr class="collapse" id="collapse_RECORDID" style="display: none;">
  <td colspan="100%">
    <table id="show_similar_RECORDID"
           class="table table-bordered table-sm"></table>
  </td>
</tr>
```

**PHP example** (right after `</tr>` of the influencer row):

```php
</tr>
<tr class="collapse" id="collapse_<?php echo (int)$row['id']; ?>" style="display: none;">
  <td colspan="100%">
    <table id="show_similar_<?php echo (int)$row['id']; ?>"
           class="table table-bordered table-sm"></table>
  </td>
</tr>
```

Use the same `colspan` as your table’s total column count if different from 100%.

---

## 3. show_stats() JavaScript Function

Requires **jQuery**. Place in a script block or external JS loaded after jQuery.

```javascript
/**
 * Toggle expandable row and load similar channels from bmiajax.php.
 * @param {string} tags - Comma-separated tag keywords (top tags).
 * @param {number|string} id - Influencer record id (light_ims id).
 */
function show_stats(tags, id) {
  var $collapse = $('#collapse_' + id);
  var $target = $('#show_similar_' + id);

  // 1. Toggle expandable row (slide animation)
  $collapse.toggle('slide');

  // 2. Loading state
  $target.html('<tr><td colspan="10">Loading similar channels...</td></tr>');

  // 3. AJAX POST to existing endpoint — server returns HTML
  $.post('/accusys.org/new-admin/bmi/bmiajax.php', {
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
}
```

Adjust the POST URL if your app lives under a different path (e.g. relative `bmiajax.php` or different base path).

---

## 4. Integration Example (Full Snippet)

Assumptions: table id `influencer-table`, 6 columns, data from PHP loop.

```html
<table id="influencer-table" class="table">
  <thead>
    <tr>
      <th>#</th>
      <th>Channel</th>
      <th>TAGS</th>
      <th>Subscribers</th>
      <th>Actions</th>
    </tr>
  </thead>
  <tbody>
    <?php foreach ($rows as $row): ?>
    <?php
      $id = (int)$row['id'];
      $tags_display = $row['top_two_tags']; // or your niches display
      $tags_ajax = ''; // build comma-separated e.g. from JSON or column
      // Example: if top_two_tags is JSON [{"tag":"Tech","score":85}]
      if (!empty($row['top_two_tags'])) {
        $decoded = json_decode($row['top_two_tags'], true);
        if (is_array($decoded)) {
          $tags_ajax = implode(',', array_column($decoded, 'tag'));
        } else {
          $tags_ajax = $row['top_two_tags'];
        }
      }
    ?>
    <tr>
      <td><?php echo $id; ?></td>
      <td><?php echo htmlspecialchars($row['channel_name'] ?? ''); ?></td>
      <td>
        <div class="niches"><?php echo htmlspecialchars($tags_display); ?></div>
        <button type="button"
                class="btn btn-success btn-small"
                onclick="show_stats('<?php echo htmlspecialchars($tags_ajax); ?>', <?php echo $id; ?>);"
                title="Show similar channels">
          <img src="/images/show_similar.png" width="28" alt="Similar">
        </button>
      </td>
      <td><?php echo htmlspecialchars($row['subscribers'] ?? ''); ?></td>
      <td>...</td>
    </tr>
    <tr class="collapse" id="collapse_<?php echo $id; ?>" style="display: none;">
      <td colspan="5">
        <table id="show_similar_<?php echo $id; ?>"
               class="table table-bordered table-sm"></table>
      </td>
    </tr>
    <?php endforeach; ?>
  </tbody>
</table>

<script>
function show_stats(tags, id) {
  $('#collapse_' + id).toggle('slide');
  $('#show_similar_' + id).html('<tr><td colspan="10">Loading similar channels...</td></tr>');
  $.post('/accusys.org/new-admin/bmi/bmiajax.php', {
    action: 'get_similar',
    tags: tags,
    id: id,
    table_name: 'bmi.light_ims'
  })
  .done(function (response) {
    $('#show_similar_' + id).html(response);
  })
  .fail(function () {
    $('#show_similar_' + id).html('<tr><td colspan="10">Error loading data</td></tr>');
  });
}
</script>
```

---

## Checklist

- Eye icon in TAGS column, below niches.
- Expandable row directly under influencer row; `id="collapse_RECORDID"`.
- Table inside expandable row: `id="show_similar_RECORDID"`.
- `show_stats(TAG_STRING, RECORD_ID)` toggles row, shows loading, POSTs to bmiajax.php, injects HTML.
- No modal; no DB change; no change to bmiajax.php; response used as HTML only.

Use the image path and AJAX URL that match your PHP IMS (e.g. relative `/bmi/images/show_similar.png` and `/bmi/bmiajax.php`).
