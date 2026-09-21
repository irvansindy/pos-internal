<?php

return [
    'spend_per_point' => (int) env('LOYALTY_SPEND_PER_POINT', 10000),
    'point_value' => (int) env('LOYALTY_POINT_VALUE', 100),
];
